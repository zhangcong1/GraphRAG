"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClusterManager = void 0;
const env_manager_1 = require("../utils/env-manager");
/**
 * Zilliz Cloud cluster manager
 * For managing Zilliz Cloud projects and clusters
 * See https://docs.zilliz.com/reference/restful/list-clusters-v2 for more details
 */
class ClusterManager {
    baseUrl;
    token;
    constructor(config) {
        // Get from environment variables first, otherwise use passed configuration
        this.baseUrl = env_manager_1.envManager.get('ZILLIZ_BASE_URL') || config?.baseUrl || 'https://api.cloud.zilliz.com';
        this.token = env_manager_1.envManager.get('MILVUS_TOKEN') || config?.token || '';
        if (!this.token) {
            throw new Error('Zilliz API token is required. Please provide it via MILVUS_TOKEN environment variable or config parameter.');
        }
    }
    /**
     * Generic method for sending HTTP requests
     */
    async makeRequest(endpoint, method = 'GET', data) {
        const url = `${this.baseUrl}${endpoint}`;
        const headers = {
            'Authorization': `Bearer ${this.token}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        };
        const options = {
            method,
            headers,
        };
        if (data && method === 'POST') {
            options.body = JSON.stringify(data);
        }
        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                const errorText = await response.text();
                let errorMessage;
                try {
                    const errorJson = JSON.parse(errorText);
                    errorMessage = errorJson.message || `HTTP ${response.status}: ${response.statusText}`;
                }
                catch {
                    errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                }
                throw new Error(errorMessage);
            }
            const result = await response.json();
            return result;
        }
        catch (error) {
            // Log the original error for more details, especially for fetch errors
            console.error('[ZillizUtils] ❌ Original error in makeRequest:', error);
            throw new Error(`Zilliz API request failed: ${error.message}`);
        }
    }
    /**
     * List all projects
     * @returns List of projects
     */
    async listProjects() {
        const response = await this.makeRequest('/v2/projects');
        if (response.code !== 0) {
            throw new Error(`Failed to list projects: ${JSON.stringify(response)}`);
        }
        return response.data;
    }
    /**
     * List all clusters
     * @param projectId Optional project ID filter
     * @param pageSize Page size, default 10
     * @param currentPage Current page number, default 1
     * @returns Cluster list with pagination info
     */
    async listClusters(projectId, pageSize = 10, currentPage = 1) {
        let endpoint = `/v2/clusters?pageSize=${pageSize}&currentPage=${currentPage}`;
        if (projectId) {
            endpoint += `&projectId=${projectId}`;
        }
        const response = await this.makeRequest(endpoint);
        if (response.code !== 0) {
            throw new Error(`Failed to list clusters: ${JSON.stringify(response)}`);
        }
        return response.data;
    }
    /**
 * Describe cluster details
 * @param clusterId Cluster ID to describe
 * @returns Cluster details
 */
    async describeCluster(clusterId) {
        const response = await this.makeRequest(`/v2/clusters/${clusterId}`);
        if (response.code !== 0) {
            throw new Error(`Failed to describe cluster: ${JSON.stringify(response)}`);
        }
        return response.data;
    }
    /**
 * Create free cluster and wait for it to be ready
 * @param request Request parameters for creating cluster
 * @param timeoutMs Timeout in milliseconds, default 5 minutes
 * @param pollIntervalMs Polling interval in milliseconds, default 5 seconds
 * @returns Creation result including cluster ID, username, password and cluster details
 */
    async createFreeCluster(request, timeoutMs = 5 * 60 * 1000, // 5 minutes default
    pollIntervalMs = 5 * 1000 // 5 seconds default
    ) {
        // Create the cluster
        const response = await this.makeRequest('/v2/clusters/createFree', 'POST', request);
        if (response.code !== 0) {
            throw new Error(`Failed to create free cluster: ${JSON.stringify(response)}`);
        }
        const { clusterId } = response.data;
        const startTime = Date.now();
        // Poll cluster status until it's ready or timeout
        while (Date.now() - startTime < timeoutMs) {
            try {
                const clusterInfo = await this.describeCluster(clusterId);
                if (clusterInfo.status === 'RUNNING') {
                    // Cluster is ready, return creation data with cluster details
                    return {
                        ...response.data,
                        clusterDetails: clusterInfo
                    };
                }
                else if (clusterInfo.status === 'DELETED' || clusterInfo.status === 'ABNORMAL') {
                    // Cluster creation failed
                    throw new Error(`Cluster creation failed with status: ${clusterInfo.status}`);
                }
                // Wait before next poll
                await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
            }
            catch (error) {
                // If it's a describe cluster error, continue polling
                // The cluster might not be immediately available for describe
                if (error.message.includes('Failed to describe cluster')) {
                    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
                    continue;
                }
                throw error;
            }
        }
        // Timeout reached
        throw new Error(`Timeout waiting for cluster ${clusterId} to be ready after ${timeoutMs}ms`);
    }
    /**
     * Static utility method to get address from token using Zilliz Cloud API
     * This method will find or create a cluster and return its connect address
     * @param token Zilliz Cloud API token
     * @returns Connect address for the cluster
     */
    static async getAddressFromToken(token) {
        if (!token) {
            throw new Error('Token is required when address is not provided');
        }
        try {
            const clusterManager = new ClusterManager({ token });
            // Get Default Project ID
            const projects = await clusterManager.listProjects();
            const defaultProject = projects.find(p => p.projectName === 'Default Project');
            if (!defaultProject) {
                throw new Error('Default Project not found');
            }
            // List clusters in the default project
            const clustersResponse = await clusterManager.listClusters(defaultProject.projectId);
            if (clustersResponse.clusters.length > 0) {
                // Use the first available cluster
                const cluster = clustersResponse.clusters[0];
                console.log(`🎯 Using existing cluster: ${cluster.clusterName} (${cluster.clusterId})`);
                return cluster.connectAddress;
            }
            else {
                // No clusters found, create a free cluster
                console.log('📝 No clusters found, creating a new free cluster...');
                const createResponse = await clusterManager.createFreeCluster({
                    clusterName: `auto-cluster-${Date.now()}`,
                    projectId: defaultProject.projectId,
                    regionId: 'gcp-us-west1' // Default region
                });
                console.log(`[ZillizUtils] ✅ Created new cluster: ${createResponse.clusterId}`);
                return createResponse.clusterDetails.connectAddress;
            }
        }
        catch (error) {
            throw new Error(`Failed to get address from token: ${error.message}`);
        }
    }
}
exports.ClusterManager = ClusterManager;
//# sourceMappingURL=zilliz-utils.js.map
export interface ZillizConfig {
    baseUrl?: string;
    token?: string;
}
export interface Project {
    projectId: string;
    projectName: string;
    instanceCount: number;
    createTime: string;
}
export interface Cluster {
    clusterId: string;
    clusterName: string;
    description: string;
    regionId: string;
    plan: string;
    cuType: string;
    cuSize: number;
    status: string;
    connectAddress: string;
    privateLinkAddress: string;
    projectId: string;
    createTime: string;
}
export interface CreateFreeClusterRequest {
    clusterName: string;
    projectId: string;
    regionId: string;
}
export interface CreateFreeClusterResponse {
    clusterId: string;
    username: string;
    password: string;
    prompt: string;
}
export interface CreateFreeClusterWithDetailsResponse extends CreateFreeClusterResponse {
    clusterDetails: DescribeClusterResponse;
}
export interface ListProjectsResponse {
    code: number;
    data: Project[];
}
export interface ListClustersResponse {
    code: number;
    data: {
        count: number;
        currentPage: number;
        pageSize: number;
        clusters: Cluster[];
    };
}
export interface CreateFreeClusterApiResponse {
    code: number;
    data: CreateFreeClusterResponse;
}
export interface DescribeClusterResponse {
    clusterId: string;
    clusterName: string;
    projectId: string;
    description: string;
    regionId: string;
    cuType: string;
    plan: string;
    status: string;
    connectAddress: string;
    privateLinkAddress: string;
    createTime: string;
    cuSize: number;
    storageSize: number;
    snapshotNumber: number;
    createProgress: number;
}
export interface DescribeClusterApiResponse {
    code: number;
    data: DescribeClusterResponse;
}
export interface ErrorResponse {
    code: number;
    message: string;
}
/**
 * Zilliz Cloud cluster manager
 * For managing Zilliz Cloud projects and clusters
 * See https://docs.zilliz.com/reference/restful/list-clusters-v2 for more details
 */
export declare class ClusterManager {
    private baseUrl;
    private token;
    constructor(config?: ZillizConfig);
    /**
     * Generic method for sending HTTP requests
     */
    private makeRequest;
    /**
     * List all projects
     * @returns List of projects
     */
    listProjects(): Promise<Project[]>;
    /**
     * List all clusters
     * @param projectId Optional project ID filter
     * @param pageSize Page size, default 10
     * @param currentPage Current page number, default 1
     * @returns Cluster list with pagination info
     */
    listClusters(projectId?: string, pageSize?: number, currentPage?: number): Promise<{
        clusters: Cluster[];
        count: number;
        currentPage: number;
        pageSize: number;
    }>;
    /**
 * Describe cluster details
 * @param clusterId Cluster ID to describe
 * @returns Cluster details
 */
    describeCluster(clusterId: string): Promise<DescribeClusterResponse>;
    /**
 * Create free cluster and wait for it to be ready
 * @param request Request parameters for creating cluster
 * @param timeoutMs Timeout in milliseconds, default 5 minutes
 * @param pollIntervalMs Polling interval in milliseconds, default 5 seconds
 * @returns Creation result including cluster ID, username, password and cluster details
 */
    createFreeCluster(request: CreateFreeClusterRequest, timeoutMs?: number, // 5 minutes default
    pollIntervalMs?: number): Promise<CreateFreeClusterWithDetailsResponse>;
    /**
     * Static utility method to get address from token using Zilliz Cloud API
     * This method will find or create a cluster and return its connect address
     * @param token Zilliz Cloud API token
     * @returns Connect address for the cluster
     */
    static getAddressFromToken(token?: string): Promise<string>;
}
//# sourceMappingURL=zilliz-utils.d.ts.map
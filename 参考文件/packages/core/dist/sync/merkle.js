"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MerkleDAG = void 0;
const crypto = __importStar(require("crypto"));
class MerkleDAG {
    constructor() {
        this.nodes = new Map();
        this.rootIds = [];
    }
    hash(data) {
        return crypto.createHash('sha256').update(data).digest('hex');
    }
    addNode(data, parentId) {
        const nodeId = this.hash(data);
        const node = {
            id: nodeId,
            hash: nodeId,
            data,
            parents: [],
            children: []
        };
        // If there's a parent, create the relationship
        if (parentId) {
            const parentNode = this.nodes.get(parentId);
            if (parentNode) {
                node.parents.push(parentId);
                parentNode.children.push(nodeId);
                this.nodes.set(parentId, parentNode);
            }
        }
        else {
            // If no parent, it's a root node
            this.rootIds.push(nodeId);
        }
        this.nodes.set(nodeId, node);
        return nodeId;
    }
    getNode(nodeId) {
        return this.nodes.get(nodeId);
    }
    getAllNodes() {
        return Array.from(this.nodes.values());
    }
    getRootNodes() {
        return this.rootIds.map(id => this.nodes.get(id)).filter(Boolean);
    }
    getLeafNodes() {
        return Array.from(this.nodes.values()).filter(node => node.children.length === 0);
    }
    serialize() {
        return {
            nodes: Array.from(this.nodes.entries()),
            rootIds: this.rootIds
        };
    }
    static deserialize(data) {
        const dag = new MerkleDAG();
        dag.nodes = new Map(data.nodes);
        dag.rootIds = data.rootIds;
        return dag;
    }
    static compare(dag1, dag2) {
        const nodes1 = new Map(Array.from(dag1.getAllNodes()).map(n => [n.id, n]));
        const nodes2 = new Map(Array.from(dag2.getAllNodes()).map(n => [n.id, n]));
        const added = Array.from(nodes2.keys()).filter(k => !nodes1.has(k));
        const removed = Array.from(nodes1.keys()).filter(k => !nodes2.has(k));
        // For modified, we'll check if the data has changed for nodes that exist in both
        const modified = [];
        for (const [id, node1] of Array.from(nodes1.entries())) {
            const node2 = nodes2.get(id);
            if (node2 && node1.data !== node2.data) {
                modified.push(id);
            }
        }
        return { added, removed, modified };
    }
}
exports.MerkleDAG = MerkleDAG;
//# sourceMappingURL=merkle.js.map
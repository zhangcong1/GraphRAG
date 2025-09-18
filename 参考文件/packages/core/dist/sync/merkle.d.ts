export interface MerkleDAGNode {
    id: string;
    hash: string;
    data: string;
    parents: string[];
    children: string[];
}
export declare class MerkleDAG {
    nodes: Map<string, MerkleDAGNode>;
    rootIds: string[];
    constructor();
    private hash;
    addNode(data: string, parentId?: string): string;
    getNode(nodeId: string): MerkleDAGNode | undefined;
    getAllNodes(): MerkleDAGNode[];
    getRootNodes(): MerkleDAGNode[];
    getLeafNodes(): MerkleDAGNode[];
    serialize(): any;
    static deserialize(data: any): MerkleDAG;
    static compare(dag1: MerkleDAG, dag2: MerkleDAG): {
        added: string[];
        removed: string[];
        modified: string[];
    };
}
//# sourceMappingURL=merkle.d.ts.map
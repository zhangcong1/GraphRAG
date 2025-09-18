import { KnowledgeGraph } from '../graph';

/**
 * 生成基于D3.js的可视化WebView内容
 */
export function generateD3WebviewContent(kg: KnowledgeGraph): string {
    const nodesData = kg.nodes.map(n => ({
        id: n.id,
        name: n.name,
        type: n.type,
        group: n.type === 'file' ? 1 : n.type === 'directory' ? 2 : 3,
        path: n.path || '',
        properties: n.properties
    }));
    
    const linksData = kg.edges.map(e => ({
        source: e.source,
        target: e.target,
        value: e.weight,
        relation: e.relation
    }));

    return `<!DOCTYPE html>
<html>
<head>
    <title>知识图谱可视化</title>
    <script src="https://d3js.org/d3.v7.min.js"></script>
    <style>
        body { 
            margin: 0; 
            font-family: Arial; 
            background: var(--vscode-editor-background); 
            color: var(--vscode-editor-foreground); 
        }
        .container {
            display: flex;
            height: 100vh;
        }
        .sidebar {
            width: 300px;
            padding: 20px;
            background: var(--vscode-panel-background);
            border-right: 1px solid var(--vscode-panel-border);
            overflow-y: auto;
        }
        .main-content {
            flex: 1;
            position: relative;
        }
        .controls { 
            position: absolute; 
            top: 10px; 
            right: 10px; 
            z-index: 1000; 
        }
        .btn { 
            padding: 8px 12px; 
            margin-left: 10px; 
            background: var(--vscode-button-background); 
            color: var(--vscode-button-foreground); 
            border: none; 
            border-radius: 4px; 
            cursor: pointer; 
        }
        .tooltip { 
            position: absolute; 
            background: var(--vscode-panel-background); 
            padding: 8px 12px; 
            border: 1px solid var(--vscode-panel-border); 
            border-radius: 6px; 
            pointer-events: none;
            font-size: 12px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            max-width: 250px;
            z-index: 9999;
            line-height: 1.4;
        }
        .stat-item {
            margin-bottom: 10px;
            padding: 8px;
            background: var(--vscode-button-background);
            border-radius: 4px;
        }
        .legend-item {
            display: flex;
            align-items: center;
            margin-bottom: 8px;
        }
        .legend-color {
            width: 16px;
            height: 16px;
            border-radius: 50%;
            margin-right: 8px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="sidebar">
            <h3>图谱统计</h3>
            <div class="stat-item">节点数量: ${kg.nodes.length}</div>
            <div class="stat-item">边数量: ${kg.edges.length}</div>
            <div class="stat-item">文件数量: ${kg.metadata.total_files}</div>
            <div class="stat-item">代码实体: ${kg.metadata.total_entities}</div>
            <div class="stat-item">社区数量: ${kg.communities.length}</div>
            
            <h3>节点类型</h3>
            <div class="legend-item">
                <div class="legend-color" style="background-color: #ff6b6b;"></div>
                <span>文件 (${kg.nodes.filter(n => n.type === 'file').length})</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background-color: #4ecdc4;"></div>
                <span>目录 (${kg.nodes.filter(n => n.type === 'directory').length})</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background-color: #45b7d1;"></div>
                <span>代码实体 (${kg.nodes.filter(n => n.type === 'entity').length})</span>
            </div>
        </div>
        
        <div class="main-content">
            <div class="controls">
                <button class="btn" onclick="resetView()">重置视图</button>
                <button class="btn" onclick="pauseSimulation()" id="pauseBtn">暂停模拟</button>
            </div>
            <svg id="graph" width="100%" height="100%"></svg>
            <div id="tooltip" class="tooltip" style="display:none;"></div>
        </div>
    </div>
    
    <script>
        const nodes = ${JSON.stringify(nodesData)};
        const links = ${JSON.stringify(linksData)};
        
        // 重要：只调用一次 acquireVsCodeApi，并保存引用
        let vscode;
        if (window.acquireVsCodeApi) {
            vscode = window.acquireVsCodeApi();
        }
        
        const svg = d3.select('#graph');
        const width = window.innerWidth - 300;
        const height = window.innerHeight;
        
        const simulation = d3.forceSimulation(nodes)
            .force('link', d3.forceLink(links).id(d => d.id).distance(80))
            .force('charge', d3.forceManyBody().strength(-200))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('collision', d3.forceCollide().radius(20));
        
        const container = svg.append('g');
        
        const zoom = d3.zoom().on('zoom', (event) => {
            container.attr('transform', event.transform);
        });
        svg.call(zoom);
        
        const link = container.append('g').selectAll('line').data(links).join('line')
            .attr('stroke', '#999')
            .attr('stroke-opacity', 0.6)
            .attr('stroke-width', d => Math.sqrt(d.value) || 1);
        
        const node = container.append('g').selectAll('circle').data(nodes).join('circle')
            .attr('r', d => d.type === 'directory' ? 12 : d.type === 'file' ? 8 : 6)
            .attr('fill', d => d.group === 1 ? '#ff6b6b' : d.group === 2 ? '#4ecdc4' : '#45b7d1')
            .attr('stroke', '#fff')
            .attr('stroke-width', 2)
            .style('cursor', d => (d.type === 'entity' || d.type === 'file') ? 'pointer' : 'default')
            .call(d3.drag()
                .on('start', dragstarted)
                .on('drag', dragged)
                .on('end', dragended))
            .on('mouseover', showTooltip)
            .on('mouseout', hideTooltip)
            .on('click', handleNodeClick);
        
        simulation.on('tick', () => {
            link
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);
            
            node
                .attr('cx', d => d.x)
                .attr('cy', d => d.y);
        });
        
        function showTooltip(event, d) {
            const tooltip = d3.select('#tooltip');
            let content = '<strong>' + d.name + '</strong><br>';
            content += '类型: ' + d.type + '<br>';
            if (d.path) content += '路径: ' + d.path + '<br>';
            if (d.type === 'entity' && d.properties) {
                if (d.properties.element_type) content += '元素类型: ' + d.properties.element_type + '<br>';
                if (d.properties.start_line) content += '行号: ' + d.properties.start_line + '-' + d.properties.end_line + '<br>';
            }
            
            // 添加点击提示
            if (d.type === 'entity' || d.type === 'file') {
                content += '<br><em style="color: #ffd700;">点击跳转到代码</em>';
            }
            
            // 修复tooltip位置，让它紧贴节点旁边
            const containerRect = document.querySelector('.main-content').getBoundingClientRect();
            const tooltipWidth = 250;
            const tooltipHeight = 100;
            
            // 获取节点在视窗中的位置
            let left = event.pageX + 10; // 节点右侧一点点距离
            let top = event.pageY - 10;  // 节点上方一点点距离
            
            // 防止tooltip超出容器边界
            if (left + tooltipWidth > containerRect.right) {
                left = event.pageX - tooltipWidth - 10; // 放在节点左侧
            }
            if (top + tooltipHeight > window.innerHeight) {
                top = event.pageY - tooltipHeight - 10; // 放在节点下方
            }
            if (top < 0) {
                top = event.pageY + 20; // 放在节点下方
            }
            
            tooltip.style('display', 'block')
                .style('left', left + 'px')
                .style('top', top + 'px')
                .html(content);
        }
        
        function hideTooltip() {
            d3.select('#tooltip').style('display', 'none');
        }
        
        // 处理节点点击事件 - 直接跳转
        function handleNodeClick(event, d) {
            event.stopPropagation();
            
            // 只有代码实体和文件节点支持跳转
            if (d.type === 'entity' || d.type === 'file') {
                // 视觉反馈：高亮被点击的节点
                node.attr('stroke', '#fff').attr('stroke-width', 2);
                d3.select(event.currentTarget)
                    .attr('stroke', '#ffd700')
                    .attr('stroke-width', 4)
                    .transition()
                    .duration(800)
                    .attr('stroke', '#fff')
                    .attr('stroke-width', 2);
                
                // 直接使用保存的 vscode 引用发送消息
                if (vscode) {
                    console.log('🚀 发送跳转消息:', {
                        type: d.type,
                        path: d.path,
                        properties: d.properties,
                        name: d.name
                    });
                    
                    vscode.postMessage({
                        command: 'navigateToCode',
                        data: {
                            type: d.type,
                            path: d.path,
                            properties: d.properties,
                            name: d.name
                        }
                    });
                } else {
                    console.error('⚠️ VS Code API 不可用');
                }
            } else {
                // 目录节点不支持跳转，显示提示
                const tooltip = d3.select('#tooltip');
                tooltip.style('display', 'block')
                    .style('left', event.pageX + 10 + 'px')
                    .style('top', event.pageY - 10 + 'px')
                    .html('目录节点不支持跳转');
                
                setTimeout(() => {
                    tooltip.style('display', 'none');
                }, 1500);
            }
        }
        
        function dragstarted(event, d) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }
        
        function dragged(event, d) {
            d.fx = event.x;
            d.fy = event.y;
        }
        
        function dragended(event, d) {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }
        
        function resetView() {
            svg.transition().duration(750).call(zoom.transform, d3.zoomIdentity);
        }
        
        let paused = false;
        function pauseSimulation() {
            const btn = document.getElementById('pauseBtn');
            if (paused) {
                simulation.restart();
                btn.textContent = '暂停模拟';
            } else {
                simulation.stop();
                btn.textContent = '继续模拟';
            }
            paused = !paused;
        }
        
        // 窗口大小改变时调整
        window.addEventListener('resize', () => {
            const newWidth = window.innerWidth - 300;
            const newHeight = window.innerHeight;
            svg.attr('width', newWidth).attr('height', newHeight);
            simulation.force('center', d3.forceCenter(newWidth / 2, newHeight / 2)).restart();
        });
    </script>
</body>
</html>`;
}
const DEFAULT_NODE_COLOR = 0x76d7f7;
const SELECTED_NODE_COLOR = 0xffd7f7;
const HOVER_NODE_COLOR = 0xffe400;
const DEFAULT_LINE_COLOR = 0x26879788;

function WebglCircle (size, color) {
    this.size = size;
    this.color = color;
}

class TransactionGraphGraphicProcessor
{
    constructor ()
    {
        // === Viva Graph Initialization ===================================
        this.graph = Viva.Graph.graph();
        this.graphics = Viva.Graph.View.webglGraphics();

        this.graphics.link (function(link) {
            return Viva.Graph.View.webglLine (DEFAULT_LINE_COLOR);
        });

        // Change node shader
        this.graphics.setNodeProgram(this.buildCircleNodeShader());
        this.graphics.setLinkProgram(this.buildLinkShader());
        this.graphics.node (function (node) {
            return new WebglCircle (1, DEFAULT_NODE_COLOR);
        });

        var layout = Viva.Graph.Layout.forceDirected (this.graph, {
            springCoeff : 0.00001,
            //dragCoeff : 0.001,
            // gravity : 0.00001
        });

        // Renderer settings
        this.renderer = Viva.Graph.View.renderer (this.graph, {
            layout      : layout,
            graphics    : this.graphics,
            container   : document.getElementById ('txgraph')
        });

        // ======= Events ===================================================
        var events = Viva.Graph.webglInputEvents (this.graphics, this.graph);

        var self = this;
        events.click (function (node) {
            self.highlightNode (node.data)
        });

        this.renderer.run();
        for (var i = 0; i < 20; i++) {
            this.renderer.zoomOut();
        }

        // === Internal data ==============================================
        this.displayedNodesSet = new Set();
    }

    // ==== Link ==========================================================
    updateLinkColor (tx, from, to, color)
    {
        var link = this.graph.getLink (from.id, to.id);
        var linkUI = this.graphics.getLinkUI (link.id);

        if (linkUI) {
            linkUI.color = color;
        }
    }

    computeLinkColor (amount)
    {
        // 0x26879788
        let r = 0x26;
        let g = 0x87;
        let b = 0x97;

        r += (amount >> 12);
        g += (amount >> 6);

        if (r > 0xff) {
            r = 0xff;
        }

        if (g > 0xff) {
            g = 0xff;
        }

        return (r << 24 | g << 16 | b << 8 | 0xff); 
    }

    displayLink (tx, tempLink, color)
    {
        let from = tx.from;
        let to = tx.to;

        if (!this.graph.hasLink (from.id, to.id))
        {
            tx.link = this.graph.addLink (from.id, to.id);

            if (tempLink) {
                this.setRemoveLinkTimeout (tx, from, to);
            }
        }

        this.updateLinkColor (tx, from, to, color);
    }

    removeLink (tx)
    {
        if (tx.link) {
            this.graph.removeLink (tx.link);
        }

        tx.link = null;

        /*
        if (from.balance <= 10) {
            self.displayedNodesSet.delete (from.id);
            self.graph.removeNode (from.id);
        }
        if (to.balance <= 10) {
            self.displayedNodesSet.delete (to.id);
            self.graph.removeNode (to.id);
        }
        */
    }

    setRemoveLinkTimeout (tx, from, to)
    {
        var self = this;

        setTimeout (function() {
            self.removeLink (tx);
        }, 5000);
    }

    // ==== Node ==========================================================
    highlightNode (node)
    {
        if (this.selectedNode) {
            // Restore default color
            this.setNodeColor (this.selectedNode, DEFAULT_NODE_COLOR);
        }

        this.selectedNode = node;
        updateInformationNode (node);
        updateShowTxLinkUi (node, true);

        this.setNodeColor (node, SELECTED_NODE_COLOR);
    }

    updateNodeSize (node)
    {
        var nodeUI = this.graphics.getNodeUI (node.id);
        nodeUI.size = this.computeNodeSize (node.balance);
    }

    setNodeColor (node, color)
    {
        var nodeUI = this.graphics.getNodeUI (node.id);
        if (nodeUI) {
            nodeUI.color = color;
        }
    }

    updateNodeColor (node)
    {
        /*
        var maxOld = 512;
        var self = this;

        node.old = 0;
        clearInterval (node.updateNodeColorInterval);

        // FIXME: Google Chrome bug, the time goes weirdly when it is enabled
        // Hypothesis : It comes from getNodeUI (mutex?)
        node.updateNodeColorInterval = setInterval (function () {

            var nodeUI = self.graphics.getNodeUI (node.id);
            if (nodeUI) {
                nodeUI.color = self.computeNodeColor (node.old);
            }

            node.old += 1;

            if (node.old > maxOld) {
                node.old = 0;
                clearInterval (node.updateNodeColorInterval);
            }

        }, 100);
        */
    }

    computeNodeColor (old)
    {
        let r = 0x76;
        let g = 0xd7;
        let b = 0xf7;

        r += (old >> 2);
        b -= (old >> 2);
        g += (old >> 2);

        if (r > 0xff) {
            r = 0xff;
        }
        if (b <= 0) {
            b = 0;
        }
        if (g > 0xff) {
            g = 0xff;
        }

        return (r << 16 | g << 8 | b); 
    }

    computeNodeSize (balance)
    {
        let max = 250;
        let min = 3;

        let size = min + (balance / 10000.0);

        if (size > max) {
            size = max;
        }

        return size;
    }

    displayNode (node)
    {
        if (!(this.displayedNodesSet.has (node.id))) {
            this.displayedNodesSet.add (node.id);
            this.graph.addNode (node.id, node);
        }

        this.updateNodeColor (node);
        this.updateNodeSize (node);
    }

    // ==== Processor =====================================================
    process (tx, isFastForwarding)
    {
        let from = tx.from;
        let to = tx.to;

        if (from) {
            this.displayNode (from);
        }

        if (to) {
            this.displayNode (to);
        }

        if (from && to && !isFastForwarding) {
            this.displayLink (tx, true, this.computeLinkColor (tx.amount))
        }
    }

    // === Shader ============================================================
    /**
     * Defines UI for links in webgl renderer.
     */
    buildLinkShader () {
        var ATTRIBUTES_PER_PRIMITIVE = 6, // primitive is Line with two points. Each has x,y and color = 3 * 2 attributes.
            BYTES_PER_LINK = 2 * (2 * Float32Array.BYTES_PER_ELEMENT + Uint32Array.BYTES_PER_ELEMENT), // two nodes * (x, y + color)
            linksFS = [
                'precision mediump float;',
                'varying vec4 color;',
                'void main(void) {',
                '   gl_FragColor = color;',
                '}'
            ].join('\n'),

            linksVS = [
                'attribute vec2 a_vertexPos;',
                'attribute vec4 a_color;',

                'uniform vec2 u_screenSize;',
                'uniform mat4 u_transform;',

                'varying vec4 color;',

                'void main(void) {',
                '   gl_Position = u_transform * vec4(a_vertexPos/u_screenSize, 0.0, 1.0);',
                '   color = a_color.abgr;',
                '}'
            ].join('\n'),

            program,
            gl, webglUtils,
            buffer,
            utils,
            locations,
            linksCount = 0,
            frontLinkId, // used to track z-index of links.
            storage = new ArrayBuffer(16 * BYTES_PER_LINK),
            positions = new Float32Array(storage),
            colors = new Uint32Array(storage),
            width,
            height,
            transform,
            sizeDirty,

            ensureEnoughStorage = function () {
                // TODO: this is a duplicate of webglNodeProgram code. Extract it to webgl.js
                if ((linksCount+1)*BYTES_PER_LINK > storage.byteLength) {
                    // Every time we run out of space create new array twice bigger.
                    // TODO: it seems buffer size is limited. Consider using multiple arrays for huge graphs
                    var extendedStorage = new ArrayBuffer(storage.byteLength * 2),
                        extendedPositions = new Float32Array(extendedStorage),
                        extendedColors = new Uint32Array(extendedStorage);

                    extendedColors.set(colors); // should be enough to copy just one view.
                    positions = extendedPositions;
                    colors = extendedColors;
                    storage = extendedStorage;
                }
            };

        return {
            load : function (glContext) {
                gl = glContext;
                webglUtils = Viva.Graph.webgl(glContext);

                program = webglUtils.createProgram(linksVS, linksFS);
                gl.useProgram(program);
                locations = webglUtils.getLocations(program, ['a_vertexPos', 'a_color', 'u_screenSize', 'u_transform']);

                gl.enableVertexAttribArray(locations.vertexPos);
                gl.enableVertexAttribArray(locations.color);

                buffer = gl.createBuffer();
            },

            position: function (linkUi, fromPos, toPos) {
                var linkIdx = linkUi.id,
                    offset = linkIdx * ATTRIBUTES_PER_PRIMITIVE;
                positions[offset] = fromPos.x;
                positions[offset + 1] = fromPos.y;
                colors[offset + 2] = linkUi.color;

                positions[offset + 3] = toPos.x;
                positions[offset + 4] = toPos.y;
                colors[offset + 5] = linkUi.color;
            },

            createLink : function (ui) {
                ensureEnoughStorage();

                linksCount += 1;
                frontLinkId = ui.id;
            },

            removeLink : function (ui) {
                if (linksCount > 0) { linksCount -= 1; }
                // swap removed link with the last link. This will give us O(1) performance for links removal:
                if (ui.id < linksCount && linksCount > 0) {
                    // using colors as a view to array buffer is okay here.
                    webglUtils.copyArrayPart(colors, ui.id * ATTRIBUTES_PER_PRIMITIVE, linksCount * ATTRIBUTES_PER_PRIMITIVE, ATTRIBUTES_PER_PRIMITIVE);
                }
            },

            updateTransform : function (newTransform) {
                sizeDirty = true;
                transform = newTransform;
            },

            updateSize : function (w, h) {
                width = w;
                height = h;
                sizeDirty = true;
            },

            render : function () {
                gl.useProgram(program);
                gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
                gl.bufferData(gl.ARRAY_BUFFER, storage, gl.DYNAMIC_DRAW);
                gl.lineWidth(5);

                if (sizeDirty) {
                    sizeDirty = false;
                    gl.uniformMatrix4fv(locations.transform, false, transform);
                    gl.uniform2f(locations.screenSize, width, height);
                }

                gl.vertexAttribPointer(locations.vertexPos, 2, gl.FLOAT, false, 3 * Float32Array.BYTES_PER_ELEMENT, 0);
                gl.vertexAttribPointer(locations.color, 4, gl.UNSIGNED_BYTE, true, 3 * Float32Array.BYTES_PER_ELEMENT, 2 * 4);

                gl.drawArrays(gl.LINES, 0, linksCount * 2);

                frontLinkId = linksCount - 1;
            },

            bringToFront : function (link) {
                if (frontLinkId > link.id) {
                    webglUtils.swapArrayPart(positions, link.id * ATTRIBUTES_PER_PRIMITIVE, frontLinkId * ATTRIBUTES_PER_PRIMITIVE, ATTRIBUTES_PER_PRIMITIVE);
                }
                if (frontLinkId > 0) {
                    frontLinkId -= 1;
                }
            },

            getFrontLinkId : function () {
                return frontLinkId;
            }
        };
    }


    buildCircleNodeShader()
    {
        var ATTRIBUTES_PER_PRIMITIVE = 4,
            nodesFS = [
            'precision mediump float;',
            'varying vec4 color;',

            'void main(void) {',
            '   if ((gl_PointCoord.x - 0.5) * (gl_PointCoord.x - 0.5) + (gl_PointCoord.y - 0.5) * (gl_PointCoord.y - 0.5) < 0.25) {',
            '     gl_FragColor = color;',
            '   } else {',
            '     gl_FragColor = vec4(0);',
            '   }',
            '}'].join('\n'),

            nodesVS = [
            'attribute vec2 a_vertexPos;',
            'attribute vec2 a_customAttributes;',
            'uniform vec2 u_screenSize;',
            'uniform mat4 u_transform;',
            'varying vec4 color;',

            'void main(void) {',
            '   gl_Position = u_transform * vec4(a_vertexPos/u_screenSize, 0, 1);',
            '   gl_PointSize = a_customAttributes[1] * u_transform[0][0];',
            '   float c = a_customAttributes[0];',
            '   color.b = mod(c, 256.0); c = floor(c/256.0);',
            '   color.g = mod(c, 256.0); c = floor(c/256.0);',
            '   color.r = mod(c, 256.0); c = floor(c/256.0); color /= 255.0;',
            '   color.a = 0.5;',
            '}'].join('\n');

        var program,
            gl, webglUtils,
            buffer,
            locations,
            utils,
            nodes = new Float32Array(60000),
            nodesCount = 0,
            canvasWidth, canvasHeight, transform,
            isCanvasDirty;

        return {
            load : function (glContext) {
                gl = glContext;
                webglUtils = Viva.Graph.webgl(glContext);

                program = webglUtils.createProgram(nodesVS, nodesFS);
                gl.useProgram(program);
                locations = webglUtils.getLocations(program, ['a_vertexPos', 'a_customAttributes', 'u_screenSize', 'u_transform']);

                gl.enableVertexAttribArray(locations.vertexPos);
                gl.enableVertexAttribArray(locations.customAttributes);

                buffer = gl.createBuffer();
            },

            position : function (nodeUI, pos) {
                var idx = nodeUI.id;
                nodes[idx * ATTRIBUTES_PER_PRIMITIVE] = pos.x;
                nodes[idx * ATTRIBUTES_PER_PRIMITIVE + 1] = -pos.y;
                nodes[idx * ATTRIBUTES_PER_PRIMITIVE + 2] = nodeUI.color;
                nodes[idx * ATTRIBUTES_PER_PRIMITIVE + 3] = nodeUI.size;
            },

            render : function() {
                gl.useProgram(program);
                gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
                gl.bufferData(gl.ARRAY_BUFFER, nodes, gl.DYNAMIC_DRAW);

                if (isCanvasDirty) {
                    isCanvasDirty = false;
                    gl.uniformMatrix4fv(locations.transform, false, transform);
                    gl.uniform2f(locations.screenSize, canvasWidth, canvasHeight);
                }

                gl.vertexAttribPointer(locations.vertexPos, 2, gl.FLOAT, false, ATTRIBUTES_PER_PRIMITIVE * Float32Array.BYTES_PER_ELEMENT, 0);
                gl.vertexAttribPointer(locations.customAttributes, 2, gl.FLOAT, false, ATTRIBUTES_PER_PRIMITIVE * Float32Array.BYTES_PER_ELEMENT, 2 * 4);

                gl.drawArrays(gl.POINTS, 0, nodesCount);
            },

            updateTransform : function (newTransform) {
                transform = newTransform;
                isCanvasDirty = true;
            },

            updateSize : function (newCanvasWidth, newCanvasHeight) {
                canvasWidth = newCanvasWidth;
                canvasHeight = newCanvasHeight;
                isCanvasDirty = true;
            },

            createNode : function (node) {
                nodes = webglUtils.extendArray(nodes, nodesCount, ATTRIBUTES_PER_PRIMITIVE);
                nodesCount += 1;
            },

            removeNode : function (node) {
                if (nodesCount > 0) { nodesCount -=1; }

                if (node.id < nodesCount && nodesCount > 0) {
                    webglUtils.copyArrayPart(nodes, node.id*ATTRIBUTES_PER_PRIMITIVE, nodesCount*ATTRIBUTES_PER_PRIMITIVE, ATTRIBUTES_PER_PRIMITIVE);
                }
            },

            replaceProperties : function(replacedNode, newNode) {},
        };
    }
}
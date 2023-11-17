let scale = 4;
let h = 300;
let w = 500;
let grid_h = 200;
let grid_w = 400;
let grid_margin = 50;
let grid = new Array(grid_h * grid_w);

let black;
let white;
let green;
let pink;

let r;
let b;
let g;
let y;
let colors = [];

let nodes = [];
let edges = [];
let marginal_points = [];
let visible_edges = [];
let node_mapping = [];
let color_map = new Array(nodes.length).fill(-1);

let lines = [];
let start, end;
let dragging = false;
let stop_updating = false;
let image_loaded = false;
let solve_start;
let solve_stage = -1;

let solveButton, resetButton;

function setup() {
    console.log("Starting up");
    createCanvas(w, h);
    noSmooth();
    frameRate(30);
    dragging = false;
    start = createVector(w / 2, h / 2);

    black = color(0);
    white = color(255);
    green = color(0, 255, 0);
    pink = color(255, 0, 255);

    r = color(226, 4, 27);
    b = color(4, 138, 208);
    g = color(51, 136, 35);
    y = color(250, 234, 4);
    colors = [r, b, g, y];
    solveButton = createButton('Solve');
    solveButton.mousePressed(button_solve);

    resetButton = createButton('Reset');
    resetButton.mousePressed(button_reset);

    // Position the buttons
    solveButton.position(12 + grid_margin, h);
    resetButton.position(346 + grid_margin, h);
}

function checkTime() {
    return (solve_start + solve_stage * 500) < millis();
}

function draw() {
    if (solve_stage >= 0) solve();
    if (stop_updating) {
        update_pixels();
        frameRate(5);
    } else {
        background(255);
        stroke(0);
        fill(255);
        rect(50, 50, grid_w - 1, grid_h - 1);

        for (let i = 0; i < lines.length; i++) {
            let a = lines[i][0];
            let b = lines[i][1];
            drawLine(a.x, a.y, b.x, b.y);
        }

        if (dragging) drawLine(start.x, start.y, end.x, end.y);
    }
}

function drawPoint(x, y) {
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            let px = x - 1 + i;
            let py = y - 1 + j;
            if (
                px >= grid_margin &&
                px < (grid_w + grid_margin) &&
                py >= grid_margin &&
                py < (grid_h + grid_margin)
            ) {
                point(px, py);
            }
        }
    }
}

function drawLine(x0, y0, x1, y1) {
    let dx = abs(x1 - x0);
    let dy = abs(y1 - y0);
    let sx = x0 < x1 ? 1 : -1;
    let sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    while (true) {
        drawPoint(x0, y0);
        if ((x0 === x1) && (y0 === y1)) break;
        let e2 = 2 * err;
        if (e2 > -dy) {
            err -= dy;
            x0 += sx;
        }
        if (e2 < dx) {
            err += dx;
            y0 += sy;
        }
    }
}

function mouseDragged() {
    end = createVector(mouseX, mouseY);
    dragging = true;
}

function mousePressed() {
    start = createVector(mouseX, mouseY);
}

function mouseReleased() {
    dragging = false;
    end = createVector(mouseX, mouseY);
    lines.push([start, end]);
    start = createVector(end.x, end.y);
}

function solve() {
    if (solve_stage === 0) {
        // Loading pixels
        console.log("stage 0");
        console.log("Loading pixels");
        loadPixels();
        for (let y = 0; y < grid_h; y++) {
            for (let x = 0; x < grid_w; x++) {
                let src = (grid_margin + y) * w + x + grid_margin;
                grid[y * grid_w + x] = pixels[src];
            }
        }
        image_loaded = false;
        solve_stage++;
    } else if (solve_stage === 1 && checkTime()) {
        console.log("stage 1");
        solve_stage++;
    } else if (solve_stage === 2) {
        // Analyzing areas & finding nodes
        console.log("stage 2");
        console.log("Analyzing areas and finding nodes");
        findNodes();
        update_pixels();
        console.log("Found a total of " + nodes.length + "areas/nodes");
        solve_stage++;
    } else if (solve_stage === 3 && checkTime()) {
        console.log("stage 3");
        solve_stage++;
    } else if (solve_stage === 4) {
        // Analyzing marginal points & finding edges
        console.log("stage 4");
        console.log("Analyzing marginal points and finding edges");
        findEdges();
        update_pixels();
        console.log("Found a total of " + edges.length + " edges.");
        solve_stage++;
    } else if (solve_stage === 5 && checkTime()) {
        console.log("stage 5");
        solve_stage++;
    } else if (solve_stage === 6) {
        console.log("stage 6");
        console.log("Building & solving graph, stand by...");
        // Building & solving graph
        solveGraph();
        console.log("Finished");
        update_pixels();
        solve_stage++;
    }
}

function fillArea(x, y, c) {
    let n = 0;
    let queue = [];
    queue.push(createVector(x, y));

    while (queue.length > 0) {
        let last = queue.length - 1;
        let p = queue[last];
        queue.pop();
        grid[p.y * grid_w + p.x] = c;
        n++;

        if (checkColor(p.x, p.y + 1, white)) queue.push(createVector(p.x, p.y + 1));
        if (checkColor(p.x, p.y - 1, white)) queue.push(createVector(p.x, p.y - 1));
        if (checkColor(p.x + 1, p.y, white)) queue.push(createVector(p.x + 1, p.y));
        if (checkColor(p.x - 1, p.y, white)) queue.push(createVector(p.x - 1, p.y));
    }
    if (n == 1) {
        grid[y * grid_w + x] = black;
        return false;
    } else {
        return true;
    }
}

function checkColor(x, y, col) {
    if (
        x < 0 ||
        y < 0 ||
        x >= grid_w ||
        y >= grid_h
    ) {
        return false;
    } else if (color(grid[y * grid_w + x]).toString() == col.toString()) {
        return true;
    } else {
        return false
    }
}

function randomColor() {
    return color(random(255), random(255), random(255));
}

function update_pixels() {
    if (!image_loaded) {
        loadPixels();
        for (let y = 0; y < grid_h; y++) {
            for (let x = 0; x < grid_w; x++) {
                let dest = (grid_margin + y) * w + x + grid_margin;
                pixels[dest] = grid[y * grid_w + x];
            }
        }
    }
    updatePixels();
    if (node_mapping.length > 0) {
        for (let y = 0; y < grid_h; y++) {
            for (let x = 0; x < grid_w; x++) {
                let c = grid[y * grid_w + x];
                for (let i = 0; i < node_mapping.length; i++) {
                    let m = node_mapping[i];
                    if (c == m[0]) {
                        grid[y * grid_w + x] = m[1];
                    }
                }
            }
        }
    } else {
        stroke(pink);
        strokeWeight(2);
        let m = grid_margin;
        for (let i = 0; i < marginal_points.length; i++) {
            let node = marginal_points[i];
            for (let j = 0; j < node.length; j++) {
                let p = node[j];
                point(p.x + m, p.y + m);
            }
        }
        stroke(green);
        strokeWeight(4);
        for (let i = 0; i < visible_edges.length; i++) {
            let pts = visible_edges[i];
            line(pts[0].x + m, pts[0].y + m, pts[1].x + m, pts[1].y + m);
        }
    }
    stroke(black);
    strokeWeight(1);
}

function findNodes() {
    for (let y = 0; y < grid_h; y++) {
        for (let x = 0; x < grid_w; x++) {
            if (color(grid[grid_w * y + x]).toString() == white.toString()) {
                let col;
                do {
                    col = randomColor();
                    console.log('Generated color:', col.toString());
                    console.log('nodes.includes(col):', nodes.includes(col));
                    console.log('col.toString() !== black.toString():', col.toString() !== black.toString());
                } while (
                    nodes.includes(col) &&
                    col.toString() !== black.toString()
                );
                if (fillArea(x, y, col)) nodes.push(col);
            }
        }
    }
}

function findEdges() {
    for (let i = 0; i < nodes.length; i++) {
        let c = nodes[i];
        marginal_points.push(findMarginalPoints(c));
    }
    console.log("Found marginal points for all areas");
    for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
            let exitFlag = false;
            let a = marginal_points[i];
            let b = marginal_points[j];

            for (let k = 0; k < a.length; k++) {
                if (exitFlag) break;
                for (let l = 0; l < b.length; l++) {
                    let p0 = a[k];
                    let p1 = b[l];

                    if (dist(p0.x, p0.y, p1.x, p1.y) < 5) {
                        visible_edges.push([
                            createVector(p0.x, p0.y),
                            createVector(p1.x, p1.y),
                        ]);
                        edges.push([i, j]);
                        exitFlag = true;
                        break;
                    }
                }
            }
        }
    }
}

function findMarginalPoints(c) {
    let points = [];

    for (let y = 0; y < grid_h; y++) {
        for (let x = 0; x < grid_w; x++) {
            if (color(grid[grid_w * y + x]).toString() == c.toString()) {
                if (checkColor(x + 1, y, black)) {
                    points.push(createVector(x, y));
                } else if (checkColor(x - 1, y, black)) {
                    points.push(createVector(x, y));
                } else if (checkColor(x, y + 1, black)) {
                    points.push(createVector(x, y));
                } else if (checkColor(x, y - 1, black)) {
                    points.push(createVector(x, y));
                }
            }
        }
    }

    return points;
}

function haveEdge(n0, n1) {
    for (let i = 0; i < edges.length; i++) {
        let e = edges[i];
        if ((e[0] == n0 && e[1] == n1) || (e[0] == n1 && e[1] == n0)) {
            return true;
        }
    }
    return false;
}

function solveGraph() {
    console.log("Calculating valence");
    let valence = new Array(nodes.length).fill(0);
    let maxValence = 0;

    for (let i = 0; i < nodes.length; i++) {
        for (let j = 0; j < edges.length; j++) {
            let e = edges[j];
            if (e[0] == i || e[1] == i) {
                valence[i] += 1;
            }
        }
        if (maxValence < valence[i]) maxValence = valence[i];
    }

    let v = maxValence;
    let sortedNodes = [];
    let nodeMap = [];
    let nodeLookup = new Array(nodes.length).fill(0);

    while (v > 0) {
        for (let i = 0; i < nodes.length; i++) {
            if (valence[i] === v) {
                if (sortedNodes.length === 0)
                    console.log("Node " + i + " has highest valence: " + v);
                sortedNodes.push(nodes[i]);
                nodeMap.push(i);
                nodeLookup[i] = sortedNodes.length - 1;
            }
        }
        v -= 1;
    }

    let nodesBackup = nodes.slice();
    let edgesBackup = edges.slice();

    nodes = sortedNodes;
    let sortedEdges = [];

    for (let i = 0; i < edges.length; i++) {
        let e = edges[i];
        sortedEdges.push([nodeLookup[e[0]], nodeLookup[e[1]]]);
    }

    edges = sortedEdges;

    color_map = new Array(nodes.length).fill(-1);

    for (let c = 0; c < 4; c++) {
        let col = colors[c];

        for (let i = 0; i < nodes.length; i++) {
            if (color_map[i] == -1) {
                let coloringPossible = true;

                for (let j = 0; j < i; j++) {
                    if (color_map[j] == c && haveEdge(i, j)) {
                        coloringPossible = false;
                        break;
                    }
                }

                if (coloringPossible) {
                    node_mapping.push([nodes[i], col]);
                    color_map[i] = c;
                }
            }
        }
    }

    if (node_mapping.length < nodes.length) {
        console.log(
            "Welsh-Powell not successful, could only color " +
            node_mapping.length +
            " out of " +
            nodes.length +
            ". Trying backtracking..."
        );
    } else {
        console.log("Coloring successful with Welsh-Powell algorithm!");
        return;
    }

    // Brute-force with backtracking
    for (let i = 0; i < nodes.length; i++) {
        color_map[i] = -1;
    }

    edges = edgesBackup.slice();
    nodes = nodesBackup.slice();
    let level = new Array(nodes.length).fill(0);

    node_mapping = [];

    color_map[0] = 0;
    let j = 1;
    let start = millis();

    while (j < nodes.length) {
        level[j] += 1;
        if (millis() - start > 10 * 1000) {
            break;
        }
        let successful = false;
        for (let c = color_map[i] + 1; c < 4; c++) {
            console.log("Trying color " + c);
            if (!color_connected(i, c)) {
                color_map[i] = c;
                for (let k = j + 1; k < nodes.length; k++) {
                    color_map[k] = -1;
                }
                successful = true;
                break;
            }
        }
        if (color_map[j] == -1 || !successful) {
            j -= 1;
        } else {
            j += 1;
        }
    }
    let missing = 0;
    for (let i = 0; i < nodes.length; i++) {
        if (color_map[i] == -1) {
            missing += 1;
        } else {
            node_mapping.push([nodes[i], colors[color_map[i]]]);
        }
    }
}

function color_connected(n, c) {
    for (let i = 0; i < edges.length; i++) {
        let e = edges[i];
        if ((n == e[0] && color_map[e[1]] == c) || (n == e[1] && color_map[e[0]] == c)) {
            return true;
        }
    }
    return false;
}

function button_solve() {
    solve_start = millis();
    solve_stage = 0;
    stop_updating = true;
}

function button_reset() {
    frameRate(30);
    lines = [];
    stop_updating = false;
    image_loaded = false;
    // document.getElementById("data").innerHTML = '';
    // document.getElementById("log").innerHTML = '';
    nodes = [];
    edges = [];
    visible_edges = [];
    marginal_points = [];
    node_mapping = [];
}

var lineFunction = d3.line()
.x(function(d) { return d.x; })
.y(function(d) { return d.y; })
.curve(d3.curveLinear);

var smoothFunction = d3.line()
.x(function(d) { return d.x; })
.y(function(d) { return d.y; })
.curve(d3.curveCardinal);

var interpolationFunction = function(t){return d3.line()
.x(function(d) { return d.x; })
.y(function(d) { return d.y; })
.curve(t > 0.5 ? d3.curveCardinal.tension((t-0.5)*2) : d3.curveCatmullRom.alpha(1-t*2));}

const distributions = {
    UNIFORM: "random",
    GAUSSIAN: "gaussian",
    INVERSEGAUSSIAN: "invgaussian",
    EQUAL: "equal",
}
const interpolationOrders = {
    SORT: "sort",
    RANDOM: 'random',
    MINMAX: "minMax"
}
const interpolations = {
    CURVE: "curve",
    LINE: "line"
}
const widthTypes = {
    CONSTANT: "constant",
    ONE: "one",
    DEVIATE: "deviate",
}

function makeEnum(enumObject){
    var all = [];
    for(var key in enumObject){
       all.push(enumObject[key]);
    }
    enumObject.all = all;
 }
class SeededRandom{
    static getSeed(length) {
       var result           = '';
       var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
       var charactersLength = characters.length;
       for ( var i = 0; i < length; i++ ) {
          result += characters.charAt(Math.floor(Math.random() * charactersLength));
       }
       return result;
   }
   static getSeededSeed(arng, length) {
       var result           = '';
       var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
       var charactersLength = characters.length;
       for ( var i = 0; i < length; i++ ) {
          result += characters.charAt(Math.floor(arng() * charactersLength));
       }
       return result;
   }
   
   static createSeed(seed, o, length){
       var arng = new alea(seed)
       var seed = null
       if (o > 0) seed = {dist: this.getSeededSeed(arng, length), path: this.getSeededSeed(arng, length), width: this.getSeededSeed(arng, length), seed: this.createSeed(this.getSeededSeed(arng, length), o-1)}
       else seed = {dist: this.getSeededSeed(arng, length), path: this.getSeededSeed(arng, length), width: this.getSeededSeed(arng, length), seed: null}
       return seed
   }

   static createNullSeed(o){
       var seed = null
       if (o > 0) seed = {dist: null, path: null, width: null, seed: this.createNullSeed(o-1)}
       else seed = {dist: null, path: null, width: null, seed: null}
       return seed
   }
}

class Line {
    constructor(svg, a, b, j, p, o, seed, distType, intOrder, intType, wType, params, acen){
        this.size = 0
        this.paths = []
        this.g = svg
        var dist = this.getJointDistribution(j, distType, seed.dist, params.dist)
        var orderedDist = this.orderInterpolation(dist, intOrder)
        var path = this.getPath(a, b, p, intType, orderedDist, this.g, seed.path, acen)
        .attr("fill", 'none').attr('stroke', 'black').attr('stroke-width', 3)
        var widenedPath = this.widen(path, wType, this.g, seed.width, params.width)
        Array.prototype.push.apply(this.paths, widenedPath);
        if (o > 0){
            if (wType == widthTypes.CONSTANT){path.attr("stroke-width", 2);}
            Array.prototype.push.apply(this.paths, (new Line(this.g, a, b, j, p, o--, seed == null ? null : seed.seed, distType, intOrder, intType, wType, params, acen)).paths);
        }
    }
    getJointDistribution (j, distType, seed, params){
        var joints = []
        var arng = seed == null ? null : new alea(seed)
        for(var i = 0; i < j; i++){
            var uniform = d3.randomUniform(0,1),
                gaussian = function(){return Math.max(Math.min(d3.randomNormal(params.mu, params.sigma)(),1),0)};
            if (seed != null){
                var normal = d3.randomNormal.source(arng)(params.mu, params.sigma);
                uniform = d3.randomUniform.source(arng)(0,1);
                gaussian = function(){return Math.max(Math.min(normal(),1),0)};
            }
            var equdistant = function(num){return (num/(j+1))};
            var invgaussian = function(){
                    var g = gaussian()
                    return (g < 0.5 ? 0.5 : 1.5)-g};
            joints.push(distType == distributions.UNIFORM ? uniform() : (distType == distributions.GAUSSIAN ? gaussian() : (distType == distributions.INVERSEGAUSSIAN ? invgaussian() : equdistant(i))))
        }
        return joints
    }
    
    orderInterpolation (dist, intOrder){
        var orderedDist = []
        if (intOrder == interpolationOrders.SORT) orderedDist = dist.sort()
        else if (intOrder == interpolationOrders.MINMAX){
            dist.sort()
            for (var i = 0; i < dist.length; i++){
                var j = dist.length-1-i
                if (j>i){
                    orderedDist.push(dist[j]) // NOTE: j first when a and b is included
                    orderedDist.push(dist[i])
                }
                else if (j == i){
                    orderedDist.push(dist[i])
                }
                else break;
            }
        }
        else orderedDist = dist
        return orderedDist
    }

    getPath (a, b, p, intType, dist, svg, seed, acen){
        var min = acen != null ? 0.5-acen : 0; // 0-1 as offset
        var max = p; // amplitude
        var arng = seed == null ? null : new alea(seed);
        var amps = null
        if (seed != null){
            amps = Array.apply(null, Array(dist.length)).map(function() {
                return (arng()-min)*max;})
        } else {
            amps = Array.apply(null, Array(dist.length)).map(function() {
                return (Math.random()-min)*max;})
        }
        var path = this.setLine(svg.append('path'), a, b, dist, amps, dist.length, 1, intType == interpolations.LINE ? lineFunction : smoothFunction)
        return path
    }

    widen (path, wType, svg, seed, params){
        if (wType == widthTypes.CONSTANT) return [path.attr('stroke-width', params.min)]
        var precision = 4
        var sections = this.dividePath(path, precision, svg)
        var widenedSections = this.assignWidths(sections, wType, seed, params)
        path.remove();
        return widenedSections
    }

    dividePath (path, precision, svg){
        var pathNode = path.node(),
            pathLength = pathNode.getTotalLength(),
            paths = [],
            prePoint = null;
        for (var point, scanLength = 0; scanLength <= pathLength; scanLength += precision) {
            point = pathNode.getPointAtLength(scanLength);
            if (prePoint != null){
                var sfLine = svg.append('line')
                        .attr('x1', prePoint.x)
                        .attr('y1', prePoint.y)
                        .attr('x2', point.x)
                        .attr('y2', point.y)
                paths.push(sfLine)
                this.size -= (point.x - prePoint.x)*Math.min(point.y, prePoint.y)+(point.x - prePoint.x)*Math.abs(point.y - prePoint.y)*0.5
            }
            
            if (scanLength != pathLength && scanLength+precision>pathLength) scanLength = pathLength - precision;
            prePoint = point;
        }
        return paths
    }

    assignWidths (sections, wType, seed, params){
        if (wType == widthTypes.ONE){
            for(var i = 0; i < sections.length; i++){
                var width = (1-Math.abs(i - sections.length/2)/(sections.length/2))*(params.max-params.min)+params.min
                sections[i].attr('stroke-width', width).attr('fill', 'none').attr('stroke','black')
                .attr('stroke-linecap', 'round')
            }
            return sections
        }
        else if (wType == widthTypes.DEVIATE){
            var arng = seed == null ? null : new alea(seed)
            var i = 0;
            
            var strokePattern = null
            if (seed != null){ strokePattern = [Math.floor(arng()*(params.maxRange-params.minRange)+params.minRange), 
                                Math.floor(arng()*(params.maxRange-params.minRange)+params.minRange), 
                                Math.floor(arng()*(params.maxRange-params.minRange)+params.minRange), 
                                Math.floor(arng()*(params.maxRange-params.minRange)+params.minRange)]
            } else {strokePattern = [Math.floor(Math.random()*(params.maxRange-params.minRange)+params.minRange), 
                     Math.floor(Math.random()*(params.maxRange-params.minRange)+params.minRange), 
                     Math.floor(Math.random()*(params.maxRange-params.minRange)+params.minRange), 
                     Math.floor(Math.random()*(params.maxRange-params.minRange)+params.minRange)]
            }
            while (i < sections.length){
                for (var k = 0; k < strokePattern.length; k++){
                    for(var l = 0; l < strokePattern[k]; l++){
                        if (i+k+l >= sections.length) return sections;
                        var use = (k % 2)
                        var sign = (k % 2) * 2 -1
                        var width = (use-sign*(l+1)/(strokePattern[k]-1))*(params.max-params.min)+params.min;
                        sections[i+k+l].attr('stroke-width', width)
                                        .attr('fill', 'none').attr('stroke','black')
                                        .attr('stroke-linecap', 'round')
                    }
                    i+= strokePattern[k]-1
                }
            }
        }
    }
    
    setLine(cloned, a, b, rndsPla, rndsDist, joints, disturbance, interpolationFunction){
        var lineData = [];
        lineData.push({x: a.x, y: a.y});
        var divLength = Math.sqrt((-(b.y-a.y))**2+(b.x-a.x)**2)
        if (divLength == 0) return null;
        var xperb = (b.x-a.x) / divLength
        var yperb = (b.y-a.y) / divLength
        for (var j = 0; j < joints; j++){ 
            var rndDist = disturbance * rndsDist[j];
            lineData.push({x: a.x+(b.x - a.x)*rndsPla[j]-yperb*rndDist, y: a.y+(b.y - a.y)*rndsPla[j]+xperb*rndDist});
        }
        lineData.push({x: b.x, y: b.y});
    
        cloned.datum(lineData);
        cloned.attr("d", interpolationFunction(lineData));
        return cloned
    }
}

class LineValue {
    constructor(svg, a, b, j, p, o, seed, distType, intOrder, intType, wType, params, acen, startWidth = null, endWidth = null){
        this.startWidth = startWidth
        this.endWidth = endWidth
        this.size = 0
        this.paths = []
        this.g = svg.append('g')
        var dist = this.getJointDistribution(j, distType, seed.dist, params.dist)
        var orderedDist = this.orderInterpolation(dist, intOrder)
        if (seed.path == null){
            console.log("bum")
        }
        var path = this.getPath(a, b, p, intType, orderedDist, this.g, seed.path, params.gaps, acen)
        .attr("fill", 'none').attr('stroke', 'black').attr('stroke-width', 3)
        var widenedPath = this.widen(path, wType, this.g, seed.width, params.width)
        Array.prototype.push.apply(this.paths, widenedPath);
        if (o > 0){
            if (wType == widthTypes.CONSTANT){path.attr("stroke-width", 2);}
            Array.prototype.push.apply(this.paths, (new LineValue(this.g, a, b, j, p, o--, seed == null ? null : seed.seed, distType, intOrder, intType, wType, params, acen, startWidth, endWidth)).paths);
        }
    }

    getJointDistribution(j, distType, seed, params){
        var joints = []
        var arng = seed == null ? null : new alea(seed)
        
        var bates = function(){return d3.randomBates(distType == -1 ? 1 : Math.abs(distType-0.5)*28+1)()};
        var calc = 0;
        if (seed != null){
            calc =  Math.abs(distType-0.5)*10+1
            bates = d3.randomBates.source(arng)(distType == -1 ? 1 : calc);
        }
        
        var invbates = function(){
            var g = bates()
            return (g < 0.5 ? 0.5 : 1.5)-g};

        for(var i = 0; i < j; i++){
            var bate = bates()
            var invbate = invbates()
            
            if (distType == -1){
                joints.push(bate)
                joints.push(bate)
                joints.push(bate)
                i+=2
            }
            else
                joints.push(distType < 0.5 ? bate : invbate)
        }
        return joints
    }

    orderInterpolation(dist, intOrder){
        var orderedDist = []
        if (intOrder < 0.25) orderedDist = dist.sort()
        else if (intOrder > 0.75){
            dist.sort()
            for (var i = 0; i < dist.length; i++){
                var j = dist.length-1-i
                if (j>i){
                    orderedDist.push(dist[j]) // NOTE: j first when a and b is included
                    orderedDist.push(dist[i])
                }
                else if (j == i){
                    orderedDist.push(dist[i])
                }
                else break;
            }
        }
        else if (intOrder > 0.5){
            dist.sort()
            if (dist.length > 2) orderedDist.push(dist[2])
            orderedDist.push(dist[0])
            var i = 2
            for (i = 4; i < dist.length; i+=2){
                orderedDist.push(dist[i])
                orderedDist.push(dist[i-3])
            }
            if (dist.length > i-1)orderedDist.push(dist[i-1])
            if (i > 4) orderedDist.push(dist[i-3])

        }
        else orderedDist = dist
        return orderedDist
    }

    getPath(a, b, p, intType, dist, svg, seed, gaps, acen){
        var min = acen != null ? 0.5-acen : 0; // 0-1 as offset
        var max = p; // amplitude
        var arng = seed == null ? null : new alea(seed);
        var amps = null
        if (seed != null){
            amps = Array.apply(null, Array(dist.length)).map(function() {
                return (arng()-min)*max;})
        } else {
            amps = Array.apply(null, Array(dist.length)).map(function() {
                return (Math.random()-min)*max;})
        }
        var path = this.setLine(svg.append('path'), a, b, dist, amps, dist.length, arng, gaps, interpolationFunction(intType))
        return path
    }

    widen(path, wType, svg, seed, params){
        if (wType < 0.2) return [path.attr('stroke-width', params.min)]
        var precision = params.precision;
        var sections = this.dividePath(path, precision, svg)
        var widenedSections = this.assignWidths(sections, wType, seed, params)
        path.remove();
        return widenedSections
    }

    dividePath(path, precision, svg){
        var pathNode = path.node(),
            pathLength = pathNode.getTotalLength(),
            paths = [],
            prePoint = null;
        for (var point, scanLength = 0; scanLength <= pathLength; scanLength += precision) {
            point = pathNode.getPointAtLength(scanLength);
            if (prePoint != null){
                var sfLine = svg.append('line')
                        .attr('x1', prePoint.x)
                        .attr('y1', prePoint.y)
                        .attr('x2', point.x)
                        .attr('y2', point.y)
                paths.push(sfLine)
                this.size -= (point.x - prePoint.x)*Math.min(point.y, prePoint.y)+(point.x - prePoint.x)*Math.abs(point.y - prePoint.y)*0.5
            }
            
            if (scanLength != pathLength && scanLength+precision>pathLength) scanLength = pathLength - precision;
            prePoint = point;
        }
        return paths
    }
    
    assignWidths(sections, wType, seed, params){
        if (wType < 0.5){
            for(var i = 0; i < sections.length; i++){
                var width = (1-Math.abs(i - sections.length/2)/(sections.length/2))*(params.max-params.min)+params.min
                sections[i].attr('stroke-width', width).attr('fill', 'none').attr('stroke','black').attr('stroke-linecap', 'round')
            }
            return sections
        }
        else if (wType < 1){
            var arng = seed == null ? null : new alea(seed)
            var i = 0;
            
            var strokePattern = null
            if (seed != null){ strokePattern = [Math.floor(arng()*(params.maxRange-params.minRange)+params.minRange), 
                                Math.floor(arng()*(params.maxRange-params.minRange)+params.minRange), 
                                Math.floor(arng()*(params.maxRange-params.minRange)+params.minRange), 
                                Math.floor(arng()*(params.maxRange-params.minRange)+params.minRange)]
            } else {strokePattern = [Math.floor(Math.random()*(params.maxRange-params.minRange)+params.minRange), 
                     Math.floor(Math.random()*(params.maxRange-params.minRange)+params.minRange), 
                     Math.floor(Math.random()*(params.maxRange-params.minRange)+params.minRange), 
                     Math.floor(Math.random()*(params.maxRange-params.minRange)+params.minRange)]
            }
            while (i < sections.length){
                for (var k = 0; k < strokePattern.length; k++){
                    for(var l = 0; l < strokePattern[k]; l++){
                        if (i+k+l >= sections.length) return sections;
                        var use = (k % 2)
                        var sign = (k % 2) * 2 -1
                        var width = (use-sign*(l+1)/(strokePattern[k]-1))*(params.max-params.min)+params.min;
                        sections[i+k+l].attr('stroke-width', width)
                                        .attr('fill', 'none').attr('stroke','black').attr('stroke-linecap', 'round')
                    }
                    i+= strokePattern[k]-1
                }
            }
        }
        else{
            var arng = seed == null ? null : new alea(seed)
            var dist = []
            var wid = []
            var bates = d3.randomBates.source(arng)(3);
            dist.push(0)
            wid.push(this.startWidth == null ? arng()*(params.max-params.min)+params.min : this.startWidth)
            for (var i = 1; i < params.j+1; i++){
                var bdist = bates()
                dist.push(bdist)
                wid.push(arng()*(params.max-params.min)+params.min)
            }
            dist.push(1)
            wid.push(this.endWidth == null ? arng()*(params.max-params.min)+params.min : this.endWidth)
            dist.sort()
            var counter = 1;
            for(var i = 0; i < sections.length; i++){
                var curLength = i/sections.length
                while (curLength > dist[counter]) counter ++
                var curStroke = (curLength - dist[counter-1]) / (dist[counter]-dist[counter-1])
                var newWidth = wid[counter-1]+(wid[counter]-wid[counter-1])*curStroke
                sections[i].attr('stroke-width', newWidth).attr('fill', 'none').attr('stroke','black').attr('stroke-linecap', params.cap)
            }
            this.startWidth = wid[0]
            this.endWidth = wid[wid.length-1]
        }
    }
    
    setLine(cloned, a, b, rndsPla, rndsDist, joints, arng, gap, interpolationFunction){
        var lineData = [];
        var divLength = Math.sqrt((-(b.y-a.y))**2+(b.x-a.x)**2)
        var displacement = divLength * gap
        lineData.push({x: a.x + (arng()-0.5)*2*displacement, y: a.y + (arng()-0.5)*2*displacement});
        if (divLength == 0) return null;
        var xperb = (b.x-a.x) / divLength
        var yperb = (b.y-a.y) / divLength
        for (var j = 0; j < joints; j++){ // j % 2 // NOTE: chanced from -2 to -1 (if something breaks) // NOTE: change from (1)-(-1) to (0)-(0)
            var rndDist = rndsDist[j];
            lineData.push({x: a.x+(b.x - a.x)*rndsPla[j]-yperb*rndDist/*/joints*j*/, y: a.y+(b.y - a.y)*rndsPla[j]+xperb*rndDist/*/joints*j*/});
        }
        lineData.push({x: b.x + (arng()-0.5)*2*displacement, y: b.y + (arng()-0.5)*2*displacement});
    
        cloned.datum(lineData);
        cloned.attr("d", interpolationFunction(lineData));
        return cloned
    }
}
class Rect {
    constructor(svg, center, rectsize, rectSeed, length, continuous, j, p, o, distType, intOrder, intType, wType, params, acen){
        this.paths = []
        this.size = 0
        var seed = null
        var arng = rectSeed == null ? null : new alea(rectSeed)
        this.g = svg.append('g')
        var a = {x: center.x - rectsize.width/2, y: center.y - rectsize.height/2},
            b = {x: center.x + rectsize.width/2, y: center.y - rectsize.height/2},
            c = {x: center.x + rectsize.width/2, y: center.y + rectsize.height/2},
            d = {x: center.x - rectsize.width/2, y: center.y + rectsize.height/2};
        var start = a
        var end = b
        var divLength = Math.sqrt((-(b.y-a.y))**2+(b.x-a.x)**2)
        var isValue = !(parseFloat(distType) !== parseFloat(distType))
        var startWidth = null
        var endWidth = null
        if (rectSeed == null){
            console.log("bum")
        }
        if (divLength != 0)
        {
            seed = rectSeed == null ? SeededRandom.createNullSeed(o) : SeededRandom.createSeed(SeededRandom.getSeededSeed(arng, length), o, length)
            var pathsT = null
            if (isValue) pathsT = new LineValue(this.g, start, end, j, p, o, seed, distType, intOrder, intType, wType, params, acen);
            else pathsT = new Line(this.g, start, end, j, p, o, seed, distType, intOrder, intType, wType, params, acen);
            startWidth = pathsT.endWidth
            endWidth = pathsT.startWidth
            this.size += pathsT.size;
            Array.prototype.push.apply(this.paths, pathsT.paths);
        }
        start = b
        end = c
        var divLength = Math.sqrt((-(c.y-b.y))**2+(c.x-b.x)**2)
        if (divLength != 0)
        {
            seed = rectSeed == null ? SeededRandom.createNullSeed(o) : SeededRandom.createSeed(SeededRandom.getSeededSeed(arng, length), o, length)
            var pathsR = null
            if (isValue) pathsR = new LineValue(this.g, start, end, j, p, o, seed, distType, intOrder, intType, wType, params, acen, continuous ? startWidth : null);
            else pathsR = new Line(this.g, start, end, j, p, o, seed, distType, intOrder, intType, wType, params, acen);
            startWidth = pathsR.startWidth
            this.size += pathsR.size;
            Array.prototype.push.apply(this.paths, pathsR.paths);
        }
        start = c
        end = d
        var divLength = Math.sqrt((-(d.y-c.y))**2+(d.x-c.x)**2)
        if (divLength != 0)
        {
            seed = rectSeed == null ? SeededRandom.createNullSeed(o) : SeededRandom.createSeed(SeededRandom.getSeededSeed(arng, length), o, length)
            var pathsB = null
            if (isValue) pathsB = new LineValue(this.g, start, end, j, p, o, seed, distType, intOrder, intType, wType, params, acen, continuous ? startWidth : null);
            else pathsB = new Line(this.g, start, end, j, p, o, seed, distType, intOrder, intType, wType, params, acen);
            startWidth = pathsB.startWidth
            this.size += pathsB.size;
            Array.prototype.push.apply(this.paths, pathsB.paths);
        }
        start = d
        end = a
        var divLength = Math.sqrt((-(a.y-d.y))**2+(a.x-d.x)**2)
        if (divLength != 0)
        {
            seed = rectSeed == null ? SeededRandom.createNullSeed(o) : SeededRandom.createSeed(SeededRandom.getSeededSeed(arng, length), o, length)
            var pathsL = null
            if (isValue) pathsL = new LineValue(this.g, start, end, j, p, o, seed, distType, intOrder, intType, wType, params, acen, continuous ? startWidth : null, continuous ? endWidth : null);
            else pathsL = new Line(this.g, start, end, j, p, o, seed, distType, intOrder, intType, wType, params, acen);
            this.size += pathsL.size;
            Array.prototype.push.apply(this.paths, pathsL.paths);
        }
        var diff = this.size -rectsize.width*rectsize.height
        this.perDiff = diff/(rectsize.width*rectsize.height)
    }
}

class Shape{
    static Line(svg, a, b, j, p, o, seed, distType, intOrder, intType, wType, params, acen){
        return new Line(svg, a, b, j, p, o, seed, distType, intOrder, intType, wType, params, acen);
    }
    static LineValue(svg, a, b, j, p, o, seed, distType, intOrder, intType, wType, params, acen, startWidth = null, endWidth = null){
        return new LineValue(svg, a, b, j, p, o, seed, distType, intOrder, intType, wType, params, acen, startWidth, endWidth);
    }
    
    static Rect(svg, center, rectsize, rectSeed, length, continuous, j, p, o, distType, intOrder, intType, wType, params, acen){
        return new Rect(svg, center, rectsize, rectSeed, length, continuous, j, p, o, distType, intOrder, intType, wType, params, acen);
    }
}

class Perturbation{
    constructor(svg){
        this.g = svg.append('g');
    }

    Perturb(params){
        
    }
}

// TODO: g placement node
class PerturbSVG extends Perturbation{
    constructor(svg, input, html){
        super(svg);
        this.g.node().append(input);
        var newSVG = this.g.select('svg')
        svg.attr('width', newSVG.attr('width')).attr('height', newSVG.attr('height'))
        this.shapes = this.ParseShapes();
        // this.g.append('svg').html(html);
        // var newSVG = this.g.select('svg').html(html)
        // svg.attr('width', input.width.baseVal.value).attr('height', input.height.baseVal.value)
        // this.shapes = this.ParseShapes();
    }

    ParseShapes(){
        var newPolys = []
        var newPaths = []
        var newRects = []
        var newLines = []
        var newSVG = this.g.select('svg')
        var object = this

        
        var lines = newSVG.selectAll('line')
        lines.each(function(d) {
            var line = d3.select(this);
            var stro = line.style('stroke')
            var node = document.createElement('g');
            var parent = line.node().parentNode;
            parent.insertBefore(node, line.node())
            var clone = object.getLine(line)
            newLines.push({line: clone, stro: stro, node: node})
        });
        lines.remove();

        var rects = newSVG.selectAll('rect')
        rects.each(function(d) {
            var rect = d3.select(this);
            var fill = rect.style('fill')
            var fillo = rect.style('fill-opacity')
            var stro = rect.style('stroke')
            var clone = object.getRectangle(rect)
            if (clone != null)
            {
                var node = document.createElement('g');
                var parent = rect.node().parentNode;
                parent.insertBefore(node, rect.node())
                newRects.push({rectangle: clone, fill: fill, fillo: fillo, stro: stro, node: node})
            }
        });
        rects.remove();

        var polys = newSVG.selectAll('polygon')
        polys.each(function(d, i){
            var poly = d3.select(this);
            var fill = poly.style('fill')
            var fillo = poly.style('fill-opacity')
            var stro = poly.style('stroke')
            var points = object.getPoints(poly)
            var node = document.createElement('g');
            var parent = poly.node().parentNode;
            parent.insertBefore(node, poly.node())
            var newPoly = object.getPolygon(points, true)
            newPolys.push({lines: newPoly, fill: fill, fillo: fillo, stro: stro, node: node})
        });
        polys.remove();

        var polys = newSVG.selectAll('polyline')
        polys.each(function(d, i){
            var poly = d3.select(this);
            var fill = poly.style('fill')
            var fillo = poly.style('fill-opacity')
            var stro = poly.style('stroke')
            var points = object.getPoints(poly)
            var node = document.createElement('g');
            var parent = poly.node().parentNode;
            parent.insertBefore(node, poly.node())
            var newPoly = object.getPolygon(points, false)
            newPolys.push({lines: newPoly, fill: fill, fillo: fillo, stro: stro, node: node})
        });
        polys.remove();

        var paths = newSVG.selectAll('path')
        paths.each(function(d, i){
            var path = d3.select(this);
            var fill = path.style('fill')
            var fillo = path.style('fill-opacity')
            var stro = path.style('stroke')
            var points = object.getPathPoints(path)
            var node = document.createElement('g');
            var parent = path.node().parentNode;
            parent.insertBefore(node, path.node())
            // var simplePoints = simplify(points, 5, true)
            // path.attr('d', lineFunction(simplePoints))
            var newPath = object.getPath(points, false)
            newPaths.push({lines: newPath, fill: fill, fillo: fillo, stro: stro, node: node})
        });
        paths.remove();

        return {polys: newPolys, lines: newLines, rectangles: newRects, paths: newPaths}
    }

    getPolygon(points, end) {
        var lines = []
    
        for (var i = 0; i < points.length - (end ? 0 : 1); i++){
            var x1 = points[i].x; var y1 = points[i].y;
            var x2 = points[(i+1)%points.length].x; var y2 = points[(i+1)%points.length].y;
            
            var divLength = Math.sqrt((-(y2-y1))**2+(x2-x1)**2)
            if (divLength == 0 && i < 1) {
                return d3.select()
            } else if (divLength == 0) break;
            lines.push({a:{x:x1, y:y1}, b:{x:x2, y:y2}})
        }
                
        return lines;
    }

    getPath(points, end) {
        var lines = []
    
        for (var i = 0; i < points.length - (end ? 0 : 1); i++){
            var x1 = points[i].x; var y1 = points[i].y;
            var x2 = points[(i+1)%points.length].x; var y2 = points[(i+1)%points.length].y;
            
            var divLength = Math.sqrt((-(y2-y1))**2+(x2-x1)**2)
            if (divLength == 0 && i < 1) {
                return d3.select()
            } else if (divLength == 0) break;
            lines.push({a:{x:x1, y:y1}, b:{x:x2, y:y2}})
        }
                
        return lines;
    }

    getTrailPath(svg, id, paths, smooth){
        var char = smooth ? 'C' : 'L'
        var fulld = paths[0].attr('d');
        for (var i = 1; i < paths.length; i++){
            var clD = paths[i].attr('d')
            var clDresult = char + clD.split(char).slice(1).join(char)
            fulld += clDresult
        }
        var clonedFull = svg.append('path')
                .attr("id", id + "full")
                .attr('d', fulld);
        return clonedFull
    }

    getPoints(node){
        var xys = []
        var points = node.attr('points').split(' ')
        var points2 = node.attr('points').match(/[+-]?\d+(\.\d+)?/g)
        for (var i = 0; i < points2.length-1; i+=2){
            xys.push({x: parseFloat(points2[i]), y: parseFloat(points2[i+1])})
        }
        return xys
    }

    getPathPoints(node){
        var xys = []
        // var points = node.attr('d').split(' ')
        var points2 = node.attr('d').match(/[+-]?\d+(\.\d+)?/g)
        for (var i = 0; i < points2.length-1; i+=2){
            xys.push({x: parseFloat(points2[i]), y: parseFloat(points2[i+1])})
        }
        return xys
    }

    setNewPathD(node, points){
        var string = `M${points[i].x},${points[i].y}`
        for (var i = 1; i < points.length; i++){
            var x1 = points[i].x; var y1 = points[i].y;
            string += `L${points[i].x},${points[i].y}`
        }
        node.attr('d', string)
    }

    getLine(selection) {
        var x1 = parseFloat(selection.attr("x1"));
        var x2 = parseFloat(selection.attr("x2"));
        var y1 = parseFloat(selection.attr("y1"));
        var y2 = parseFloat(selection.attr("y2"));

        return {a:{x: x1, y: y1}, b:{x:x2, y:y2}}
    }

    getRectangle(selection) {
        var x1 = selection.attr("x1");
        if (x1 == null) x1 = selection.attr("x");
        var y1 = selection.attr("y1");
        if (y1 == null) y1 = selection.attr("y");
        if (x1 != null){
            x1 = parseFloat(x1.match(/[+-]?\d+(\.\d+)?/g));
            y1 = parseFloat(y1.match(/[+-]?\d+(\.\d+)?/g));
        }
        var width = parseFloat(selection.attr("width"));
        var height = parseFloat(selection.attr("height"));
        var Q = x1 == null ||
                y1 == null ||
                x1 !== x1 || 
                y1 !== y1 || 
                width !== width || 
                height !== height 
    
        if (!Q){
            return{rectSize: {width: width, height: height},
                    center: {x: x1+width/2, y: y1+height/2}}
        }
        return null
    }

    Perturb(params){
        for (var i = 0; i < this.shapes.lines.length; i++) {d3.select(this.shapes.lines[i].node).selectAll('*').remove()}
        for (var i = 0; i < this.shapes.rectangles.length; i++) {d3.select(this.shapes.rectangles[i].node).selectAll('*').remove()}
        for (var i = 0; i < this.shapes.polys.length; i++) {d3.select(this.shapes.polys[i].node).selectAll('*').remove()}
        for (var i = 0; i < this.shapes.paths.length; i++) {d3.select(this.shapes.paths[i].node).selectAll('*').remove()}

        var arng = params.seed != null ? new alea(SeededRandom.getSeed(params.length)) : new alea(params.seed) 
        for (var i = 0; i < this.shapes.lines.length; i++){
            var shape = this.shapes.lines[i]
            var line = Shape.Line(d3.select(shape.node),
                                shape.line.a,
                                shape.line.b,
                                params.j,
                                params.p,
                                params.o,
                                SeededRandom.createSeed(SeededRandom.getSeededSeed(arng, params.length), params.o, params.length),
                                params.distType,
                                params.intOrder,
                                params.intType,
                                params.wType,
                                params.params,
                                params.acen)
        }
        
        for (var i = 0; i < this.shapes.rectangles.length; i++){
            var shape = this.shapes.rectangles[i]
            var rect = Shape.Rect(d3.select(shape.node), 
                                shape.rectangle.center,
                                shape.rectangle.rectSize,
                                params.j,
                                params.p,
                                params.o,
                                SeededRandom.createSeed(SeededRandom.getSeededSeed(arng, params.length), params.o, params.length),
                                params.distType,
                                params.intOrder,
                                params.intType,
                                params.wType,
                                params.params,
                                params.acen)
            this.getTrailPath(d3.select(shape.node), "rect" + i, rect.paths, params.intType != 'line')
                .style('fill', shape.fill != null ? shape.fill : 'none')
                .style('fill-opacity', shape.fillo != null ? shape.fillo : 'none')
                .style('stroke', shape.stro != null ? shape.stro : 'none')
        }
        
        for (var i = 0; i < this.shapes.polys.length; i++){
            var shape = this.shapes.polys[i]
            var paths = []
            for (var j = 0; j < shape.lines.length; j++){
                var line = Shape.Line(d3.select(shape.node), 
                                    shape.lines[j].a,
                                    shape.lines[j].b,
                                    params.j,
                                    params.p,
                                    params.o,
                                    SeededRandom.createSeed(SeededRandom.getSeededSeed(arng, params.length), params.o, params.length),
                                    params.distType,
                                    params.intOrder,
                                    params.intType,
                                    params.wType,
                                    params.params,
                                    params.acen)
                Array.prototype.push.apply(paths, line.paths);
            }
            if (paths.length > 0)
                this.getTrailPath(d3.select(shape.node), "rect" + i, paths, params.intType != 'line')
                    .style('fill', shape.fill != null ? shape.fill : 'none')
                    .style('fill-opacity', shape.fillo != null ? shape.fillo : 'none')
                    .style('stroke', shape.stro != null ? shape.stro : 'none')
        }
        
        for (var i = 0; i < this.shapes.paths.length; i++){
            var shape = this.shapes.paths[i]
            var paths = []
            for (var j = 0; j < shape.lines.length; j++){
                var line = Shape.Line(d3.select(shape.node), 
                                    shape.lines[j].a,
                                    shape.lines[j].b,
                                    params.j,
                                    params.p,
                                    params.o,
                                    SeededRandom.createSeed(SeededRandom.getSeededSeed(arng, params.length), params.o, params.length),
                                    params.distType,
                                    params.intOrder,
                                    params.intType,
                                    params.wType,
                                    params.params,
                                    params.acen)
                Array.prototype.push.apply(paths, line.paths);
            }
            if (paths.length > 0)
                this.getTrailPath(d3.select(shape.node), "rect" + i, paths, params.intType != 'line')
                    .style('fill', shape.fill != null ? shape.fill : 'none')
                    .style('fill-opacity', shape.fillo != null ? shape.fillo : 'none')
                    .style('stroke', shape.stro != null ? shape.stro : 'none')
        }
    }
}

class PerturbGEDCOM extends Perturbation{
    constructor(svg, input){
        super(svg);
        // this.g.remove()
        this.svg = svg
        this.perturbed = []
        this.size = {width: parseInt(svg.attr('width')), height: parseInt(svg.attr('height'))}
        this.ged = parse.d3ize(parse.parse(royalGED))
        this.pg = this.buildLargestPedigreeGraph(this.ged)
    }
    
    buildLargestPedigreeGraph(graph){
        var famstart = 0
        for (var i = 0; i < graph.nodes.length; i++){
            if (graph.nodes[i].tag == "FAM") {
                famstart = i
                break;}
        }
        var graphNodes = graph.nodes.slice();
        var mapToP = graphNodes.splice(3010).reduce(function(map, arr) {
            var mapToR = arr.tree.reduce(function(map2, arr2) {
                var index = parseInt(arr2.data.substring(2,arr2.data.length-1));
                if (map2[arr2.tag] == null)
                {
                    map2[arr2.tag] = [index];
                } else{
                    map2[arr2.tag].push(index);
                }
                return map2;
            }, {});
            
            if (mapToR["WIFE"] != null && mapToR["HUSB"] != null && mapToR["CHIL"] != null){
                for (var i = 0; i < mapToR["CHIL"].length; i++){
                    map[mapToR["CHIL"][i]] = [mapToR["WIFE"][0], mapToR["HUSB"][0]]
                }
            } 
            return map;
        }, {});
        
        var map = mapToP
        var PSMap = {}
        var largest = 0
        var largestId = -1
        for (var i = 0; i < famstart; i++){
            if (map[i] == null) continue;
            PSMap = this.getPedigreeSizemap(map, i, PSMap)
        }
        for (var i = 0; i < famstart; i++){
            if (map[i] == null) continue;
            if (PSMap[i]>largest){
                largest = PSMap[i];
                largestId = i;
            }
        }
        if (largestId == -1) console.log("something is wrong")
    
        var newDepth = PSMap[largestId]
        console.log(graph.nodes[largestId].name)
        if (map[largestId] == null){
            lblRoot.text("INVALID")
            return
        }
        var leaves = this.getDepthLeaves(map, largestId, newDepth-1)
        return {leaves: leaves, map: map, root: largestId, depth: newDepth-1}
    }

    Perturb(params){
        this.g.selectAll('*').remove()
        // this.g = this.svg.append('g').attr('type', params.params.type);
        // this.perturbed.push(this.g);
        var uglySeed = params.seed
        if (uglySeed == null) uglySeed = SeededRandom.getSeed(10)
        
        // procedural values
        if (!params.interpolate) {
            //treemap or icicle
            if (params.isTreemap) return this.drawRoyalTreemap({center:{x:0,y:0},rect:{width:this.size.width,height:this.size.height}}, params.rectStyle, params.params, uglySeed, true);
            else return this.drawRoyalIcicle({center:{x:this.size.width*0.5,y:this.size.height*0.15},rect:{width:this.size.width,height:this.size.height*0.3}}, params.params, uglySeed, true)
        } else{
            //treemap or icicle
            if (params.isTreemap) return this.interpolatedRoyal({center:{x:0,y:0},rect:{width:this.size.width,height:this.size.height}}, params.rectStyle, uglySeed, params.useRandom, params.ignore == null ? [] : params.ignore, true);
            else return this.icicleRoyal({center:{x:this.size.width*0.5,y:this.size.height*0.15},rect:{width:this.size.width,height:this.size.height*0.3}}, params.rectStyle, uglySeed, true);
        }
    }
    interpolatedRoyal(rect, isRect, seed, useRandom, ignore, bi = false){
        var seed = (seed == null ? SeededRandom.getSeed(10) : seed)
        var arng = new alea(seed)
        var pixels = {width: this.size.width/16, height: this.size.height/16}
        var object = this
        var params = Array.apply(null, Array(11)).map(function(){return useRandom ? object.genRandomMap(arng, {width: Math.round(object.size.width/pixels.width), height: Math.round(object.size.height/pixels.height)}) : object.genNoiseMap(arng, {width: Math.round(object.size.width/pixels.width), height: Math.round(object.size.height/pixels.height)}, 0.1)}) // step = 0.1
        var newRect = {center: {x:rect.rect.width/2, y:rect.rect.height/2}, rect: {width: rect.rect.width*0.94, height: rect.rect.height*0.94 }}
        rect = {center: {x:rect.rect.width*0.03, y:rect.rect.height*0.03}, rect: newRect.rect}
        var returnStuff = {seed: seed, targetList: [], targets: null}
        if (!isRect){
            var lineDataDict = this.getLineDict(this.pg.root, rect, 0, {x:0,y:0}, bi)
            if (ignore.includes(7)){
                lineDataDict.result.push({a:{x:newRect.center.x-newRect.rect.width/2,
                                            y:newRect.center.y-newRect.rect.height/2},
                                        b:{x:newRect.center.x+newRect.rect.width/2,
                                            y:newRect.center.y-newRect.rect.height/2}})
                lineDataDict.result.push({a:{x:newRect.center.x+newRect.rect.width/2,
                                            y:newRect.center.y-newRect.rect.height/2},
                                            b:{x:newRect.center.x+newRect.rect.width/2,
                                            y:newRect.center.y+newRect.rect.height/2}})
                lineDataDict.result.push({a:{x:newRect.center.x+newRect.rect.width/2,
                                            y:newRect.center.y+newRect.rect.height/2},
                                            b:{x:newRect.center.x-newRect.rect.width/2,
                                            y:newRect.center.y+newRect.rect.height/2}})
                lineDataDict.result.push({a:{x:newRect.center.x-newRect.rect.width/2,
                                            y:newRect.center.y+newRect.rect.height/2},
                                            b:{x:newRect.center.x-newRect.rect.width/2,
                                            y:newRect.center.y-newRect.rect.height/2}})
                lineDataDict.layer.push(1)
                lineDataDict.layer.push(1)
                lineDataDict.layer.push(1)
                lineDataDict.layer.push(1)
                lineDataDict.area.push(newRect)
                lineDataDict.area.push(newRect)
                lineDataDict.area.push(newRect)
                lineDataDict.area.push(newRect)
                lineDataDict.pos.push({x:0,y:0})
                lineDataDict.pos.push({x:0,y:0})
                lineDataDict.pos.push({x:0,y:0})
                lineDataDict.pos.push({x:0,y:0})
            }
            
            var targets = this.g.append('g')
            var targetList = []
            for(var i = 0; i < lineDataDict.result.length; i++){
                if (lineDataDict.layer[i] > this.pg.depth) continue;
                if (lineDataDict.layer[i] == this.pg.depth){
                    var path = this.makePath(targets, lineDataDict.area[i])
                    path.attr('id', lineDataDict.id[i])
                    var c = lineDataDict.area[i].center
                    var r = lineDataDict.area[i].rect
                    var pos = {x: 1+Math.floor((c.x - r.width*0.5)/pixels.width), y:  1+Math.floor((c.y - r.height*0.5)/pixels.height)}
                    path.attr('posx', pos.x)
                    path.attr('posy', pos.y)
                    targetList.push(path)
                }
            }
            for(var i = 0; i < lineDataDict.result.length; i++){
                if (lineDataDict.layer[i] > this.pg.depth) continue;
                if(lineDataDict.result[i] == null) continue;
                var c = lineDataDict.area[i].center
                var r = lineDataDict.area[i].rect
                var pos = {x: 1+Math.floor((c.x - r.width*0.5)/pixels.width), y:  1+Math.floor((c.y - r.height*0.5)/pixels.height)}
                
                var sects = 2**Math.floor((this.pg.depth-lineDataDict.layer[i]+1)/2)
                var runthroughs = ignore.includes(7) ? sects: 1
                
                for (var j = 0; j < runthroughs; j++){
                    var a = lineDataDict.result[i].a
                    var b = lineDataDict.result[i].b
                    if (ignore.includes(7)){
                        a = {x: a.x+(b.x-a.x)/sects*j,
                            y: a.y+(b.y-a.y)/sects*j}
                        b = {x: a.x+(b.x-a.x)/sects*(j+1),
                            y: a.y+(b.y-a.y)/sects*(j+1)}
                        pos = {x:Math.floor((a.x+(b.x-a.x)/2)/pixels.width),y:Math.floor((a.y+(b.y-a.y)/2)/pixels.height)}
                    }
                    var line = Shape.LineValue(
                        this.g,
                        a,
                        b,
                        !ignore.includes(0) ? Math.floor(params[0][pos.x][pos.y]*17+1) : 17*0.5+1,
                        !ignore.includes(1) ? 10*params[1][pos.x][pos.y]*0.4+1 : 3,
                        0,
                        SeededRandom.createSeed(SeededRandom.getSeededSeed(arng, params.length), 0, params.length),
                        !ignore.includes(2) ? params[3][pos.x][pos.y] : 0.5,
                        !ignore.includes(3) ? params[4][pos.x][pos.y] : 0.1,
                        !ignore.includes(4) ? params[5][pos.x][pos.y] : 0.5,
                        1,
                        {
                            dist:{
                                mu: params.mu,
                                sigma: params.sigma,
                            },
                            width:{
                                cap: 'round',
                                j: !ignore.includes(5) ? 2 : 0,
                                precision: 4,
                                min: !ignore.includes(5) ? 0.2 : 1,
                                max: !ignore.includes(5) ? params[6][pos.x][pos.y]*4+3 : 3,
                                minRange: params[9][pos.x][pos.y]*3+2,
                                maxRange: params[10][pos.x][pos.y]*5+params[9][pos.x][pos.y]*3+2,
                            },
                            gaps: 0,
                        },
                        0,
                    );
                }
            }
            if (!ignore.includes(7)){
                var rect = Shape.Rect(
                    this.g,
                    newRect.center, 
                    newRect.rect,
                    SeededRandom.getSeededSeed(arng, params.length),
                    params.length,
                    false,
                    !ignore.includes(0) ? Math.floor(params[0][pos.x][pos.y]*17)+1 : 0.2*17+2,
                    !ignore.includes(1) ? 10*params[1][pos.x][pos.y]*0.4+1 : 5*0.33+2,
                    0,
                    !ignore.includes(2) ? params[3][pos.x][pos.y] : 0.5,
                    !ignore.includes(3) ? params[4][pos.x][pos.y] : 0.1,
                    !ignore.includes(4) ? params[5][pos.x][pos.y] : 0.5,
                    1,
                    {
                        dist:{
                            mu: params.mu,
                            sigma: params.sigma,
                        },
                        width:{
                            cap: 'round',
                            j: !ignore.includes(5) ? 2 : 0,
                            precision: 2,
                            min: !ignore.includes(5) ? 0.2 : 1,
                            max: !ignore.includes(5) ? params[6][pos.x][pos.y]*4+1 : 1,
                            minRange: 16,
                            maxRange: 32,
                        },
                        gaps:0,
                    },
                    0,
                );
            }
            returnStuff['targets'] = targets.selectAll('path')
            returnStuff['targetList'] = targetList.sort(function(a,b){
                var ax = parseInt(a.attr("posx"))
                var ay = parseInt(a.attr("posy"))
                var bx = parseInt(b.attr("posx"))
                var by = parseInt(b.attr("posy"))
                if (ax+16*ay>bx+16*by) return 1
                if (ax+16*ay<bx+16*by) return -1
                return 0
            })
            return returnStuff
        }
        else{  
            var targets = this.g.append('g')
            var targetList = []
            var rectDataDict = this.getRectDict(this.pg.root, rect, 0, {x:0,y:0}, bi)
            for(var i = 0; i < rectDataDict.result.length; i++){
                if (rectDataDict.layer[i] > this.pg.depth) continue;
                if (rectDataDict.layer[i] == this.pg.depth){
                    var path = this.makePath(targets, rectDataDict.result[i])
                    path.attr('id', rectDataDict.id[i])
                    var c = rectDataDict.result[i].center
                    var r = rectDataDict.result[i].rect
                    var pos = {x: 1+Math.floor((c.x - r.width*0.5)/pixels.width), y:  1+Math.floor((c.y - r.height*0.5)/pixels.height)}
                    path.attr('posx', pos.x)
                    path.attr('posy', pos.y)
                    targetList.push(path)
                }
            }

            for(var i = 0; i < rectDataDict.result.length; i++){
                if (rectDataDict.layer[i] > this.pg.depth) continue;
                var c = rectDataDict.result[i].center
                var r = rectDataDict.result[i].rect
                var pos = {x: 1+Math.floor((c.x - r.width*0.5)/pixels.width), y:  1+Math.floor((c.y - r.height*0.5)/pixels.height)}
                var rect = Shape.Rect(
                    this.g,
                    c, 
                    r,
                    SeededRandom.getSeededSeed(arng, params.length),
                    params.length,
                    false,
                    !ignore.includes(0) ? Math.floor(params[0][pos.x][pos.y]*17)+1 : 0.2*17+2,
                    !ignore.includes(1) ? 10*params[1][pos.x][pos.y]*0.4+1 : 5*0.33+2,
                    0,
                    !ignore.includes(2) ? params[3][pos.x][pos.y] : 0.5,
                    !ignore.includes(3) ? params[4][pos.x][pos.y] : 0.1,
                    !ignore.includes(4) ? params[5][pos.x][pos.y] : 0.5,
                    1,
                    {
                        dist:{
                            mu: params.mu,
                            sigma: params.sigma,
                        },
                        width:{
                            cap: 'round',
                            j: !ignore.includes(5) ? 2 : 0,
                            precision: 2,
                            min: !ignore.includes(5) ? 0.2 : 1,
                            max: !ignore.includes(5) ? params[6][pos.x][pos.y]*4+1 : 1,
                            minRange: 16,
                            maxRange: 32,
                        },
                        gaps:0,
                    },
                    0,
                );
            }
            returnStuff['targets'] = targets.selectAll('path')
            returnStuff['targetList'] = targetList.sort( function (a,b){
                var ax = parseInt(a.attr("posx"))
                var ay = parseInt(a.attr("posy"))
                var bx = parseInt(b.attr("posx"))
                var by = parseInt(b.attr("posy"))
                if (ax+16*ay>bx+16*by) return 1
                if (ax+16*ay<bx+16*by) return -1
                return 0
            })
            return returnStuff
        }
    }

    icicleRoyal(rect, isRect, seed, bi = false){
        var seed = (seed == null ? SeededRandom.getSeed(10) : seed)
        var arng = new alea(seed)
        var rndelement = Math.floor(arng()*(2**this.pg.depth))
        var pixels = {width: this.size.width/15, height: this.size.height/15}
        var object = this
        var params = Array.apply(null, Array(10)).map(function(){return object.genNoiseMap(arng, {width: Math.round(object.size.width/pixels.width), height: Math.round(object.size.height/pixels.height)}, 0.1)})
        var leafCounter = 0
        var focused = null
        
        var other = this.g.append('g')
        var rectDataDict = this.getIcicleDict(this.pg.root, rect, 0, bi)
        for(var i = 0; i < rectDataDict.result.length; i++){
            if (rectDataDict.layer[i] > this.pg.depth) continue;
            var pos = {x: Math.floor((rectDataDict.result[i].center.x - rectDataDict.result[i].rect.width*0.5)/pixels.width), y:  Math.floor((rectDataDict.result[i].center.y - rectDataDict.result[i].rect.height*0.5)/pixels.width)}
            var rect = Shape.Rect(
                this.g,
                rectDataDict.result[i].center, 
                rectDataDict.result[i].rect,
                SeededRandom.getSeededSeed(arng, params.length),
                params.length,
                false,
                Math.floor(params[0][pos.x][pos.y]*17+2),
                20*params[1][pos.x][pos.y]*0.33+2,
                0,
                params[3][pos.x][pos.y],
                params[4][pos.x][pos.y],
                params[5][pos.x][pos.y],
                0.9,
                {
                    dist:{
                        mu: params.mu,
                        sigma: params.sigma,
                    },
                    width:{
                        min: params[6][pos.x][pos.y]*3+2,
                        max: params[7][pos.x][pos.y]*3+params[6][pos.x][pos.y]*3+2,
                        minRange: params[8][pos.x][pos.y]*3+2,
                        maxRange: params[9][pos.x][pos.y]*5+params[8][pos.x][pos.y]*3+2,
                    }
                },
                0,
            );
        }
        return focused
    }

    drawRoyalTreemap(rect, isRect, params, seed, bi = false){
        var seed = (seed == null ? SeededRandom.getSeed(10) : seed)
        var arng = new alea(seed)
        var pixels = {width: this.size.width/15, height: this.size.height/15}
        rect = {center: {x:-rect.rect.width*0.03, y:-rect.rect.height*0.03}, rect: {width: rect.rect.width*1.06, height: rect.rect.height*1.06 }}
        var returnStuff = {seed: seed, targetList: [], targets: null}
        if (!isRect){
            var lineDataDict = this.getLineDict(this.pg.root, rect, 0, {x:0,y:0}, bi)
            var targets = this.g.append('g')
            var targetList = []
            for(var i = 0; i < lineDataDict.result.length; i++){
                if (lineDataDict.layer[i] > this.pg.depth) continue;
                if (lineDataDict.layer[i] == this.pg.depth){
                    var path = this.makePath(targets, lineDataDict.area[i])
                    path.attr('id', lineDataDict.id[i])
                    
                    var c = lineDataDict.area[i].center
                    var r = lineDataDict.area[i].rect
                    var pos = {x: 1+Math.floor((c.x - r.width*0.5)/pixels.width), y:  1+Math.floor((c.y - r.height*0.5)/pixels.height)}
                    
                    path.attr('posx', pos.x)
                    path.attr('posy', pos.y)
                    targetList.push(path)
                }
                if(lineDataDict.result[i] == null) continue;
                var a = lineDataDict.result[i].a
                var b = lineDataDict.result[i].b
                var line = Shape.Line(
                    this.g,
                    a,
                    b,
                    parseInt(joints),
                    20*maxPert,
                    params.o, 
                    SeededRandom.createSeed(SeededRandom.getSeededSeed(arng, params.length), params.o, params.length),//{dist: null, path: null, width: null},
                    params.dT,
                    params.iO,
                    params.iT,
                    params.wT,
                    {
                        dist:{
                            mu: params.mu,
                            sigma: params.sigma,
                        },
                        width:{
                            min: params.min,
                            max: params.max,
                            minRange: params.minRange,
                            maxRange: params.maxRange,
                        },
                        acen: 0,
                    }
                );
            }
            returnStuff['targets'] = targets.selectAll('path')
            returnStuff['targetList'] = targetList.sort( function (a,b){
                var ax = parseInt(a.attr("posx"))
                var ay = parseInt(a.attr("posy"))
                var bx = parseInt(b.attr("posx"))
                var by = parseInt(b.attr("posy"))
                if (ax+16*ay>bx+16*by) return 1
                if (ax+16*ay<bx+16*by) return -1
                return 0
            })
            return returnStuff
        }
        else{
            var targets = this.g.append('g')
            var targetList = []
            var rectDataDict = this.getRectDict(this.pg.root, rect, 0, {x:0,y:0}, bi)
            for(var i = 0; i < rectDataDict.result.length; i++){
                if (rectDataDict.layer[i] > this.pg.depth) continue;
                if (rectDataDict.layer[i] == this.pg.depth){
                    var path = this.makePath(targets, rectDataDict.result[i])
                    path.attr('id', rectDataDict.id[i])
                    
                    var c = rectDataDict.result[i].center
                    var r = rectDataDict.result[i].rect
                    var pos = {x: 1+Math.floor((c.x - r.width*0.5)/pixels.width), y:  1+Math.floor((c.y - r.height*0.5)/pixels.height)}
                    
                    path.attr('posx', pos.x)
                    path.attr('posy', pos.y)
                    targetList.push(path)
                }
                var rect = Shape.Rect(
                    this.g,
                    rectDataDict.result[i].center, 
                    rectDataDict.result[i].rect,
                    SeededRandom.getSeededSeed(arng, params.length),
                    params.length,
                    false,
                    parseInt(joints),
                    20*maxPert,
                    params.o,
                    params.dT,
                    params.iO,
                    params.iT,
                    params.wT,
                    {
                        dist:{
                            mu: params.mu,
                            sigma: params.sigma,
                        },
                        width:{
                            min: params.min,
                            max: params.max,
                            minRange: params.minRange,
                            maxRange: params.maxRange,
                        }
                    },
                    0,
                );
            }
            returnStuff['targets'] = targets.selectAll('path')
            returnStuff['targetList'] = targetList.sort( function (a,b){
                var ax = parseInt(a.attr("posx"))
                var ay = parseInt(a.attr("posy"))
                var bx = parseInt(b.attr("posx"))
                var by = parseInt(b.attr("posy"))
                if (ax+16*ay>bx+16*by) return 1
                if (ax+16*ay<bx+16*by) return -1
                return 0
            })
            return returnStuff
        }
    }

    drawRoyalIcicle(rect, joints, maxPert, params, seed, bi = false){
        var seed = (seed == null ? SeededRandom.getSeed(10) : seed)
        var arng = new alea(seed)
        var rndelement = Math.floor(arng()*(2**this.pg.depth))
        var leafCounter = 0
        var focused = null
        var other = this.g.append('g')
        var rectDataDict = this.getIcicleDict(this.pg.root, rect, 0, bi)
        for(var i = 0; i < rectDataDict.result.length; i++){
            if (rectDataDict.layer[i] > this.pg.depth) continue;
            if (rectDataDict.layer[i] == this.pg.depth){
                if (rndelement == leafCounter) {
                    focused = {id: rectDataDict.id[i], path: this.makePath(this.g, rectDataDict.result[i]), circle: this.makeCircle(this.g, rectDataDict.result[i]), seed: seed, others: null}
                } else {
                    var path = this.makePath(other, rectDataDict.result[i])
                    path.attr('id', rectDataDict.id[i])
                }
                leafCounter++
            }
            var rect = Shape.Rect(
                this.g,
                rectDataDict.result[i].center, 
                rectDataDict.result[i].rect,
                SeededRandom.getSeededSeed(arng, params.length),
                params.length,
                false,
                parseInt(joints),
                20*maxPert,
                params.o, 
                params.dT,
                params.iO,
                params.iT,
                params.wT,
                {
                    dist:{
                        mu: params.mu,
                        sigma: params.sigma,
                    },
                    width:{
                        min: params.min,
                        max: params.max,
                        minRange: params.minRange,
                        maxRange: params.maxRange,
                    }
                },
                -0.5
            );
        }
        focused['others'] = other.selectAll('path')
        return focused
    }

    genNoiseMap(seedFunc, size, step){
        noise.seed(seedFunc());
        var map = Array.apply(null, Array(size.width)).map(function(){return Array.apply(null, Array(size.height)).map(function(){return 0;})})
        for (var x = 0; x < map.length; x++) {
          for (var y = 0; y < map[x].length; y++) {
            var value = noise.simplex2(x * step, y * step); 
            if (value < -1 || value > 1) console.log("found one: " + value)
            map[x][y] = (value+1)*0.5;
          }
        }
        return map
    }

    genRandomMap(seedFunc, size){
        // noise.seed(floatSeed);
        var arng = new alea(SeededRandom.getSeededSeed(seedFunc, 10));
        var map = Array.apply(null, Array(size.width)).map(function(){return Array.apply(null, Array(size.height)).map(function(){return 0;})})
        for (var x = 0; x < map.length; x++) {
          for (var y = 0; y < map[x].length; y++) {
            var value = arng()
            map[x][y] = Math.floor(value*5)/4
          }
        }
        return map
    }

    getPedigreeSizemap(mapToP, id, currentPSMap){
        if (currentPSMap[id] != null) return currentPSMap
        if (mapToP[id] == null) {
            currentPSMap[id] = 1
            return currentPSMap
        }
        currentPSMap = this.getPedigreeSizemap(mapToP, mapToP[id][0], currentPSMap)
        currentPSMap = this.getPedigreeSizemap(mapToP, mapToP[id][1], currentPSMap)
        currentPSMap[id] = 1+Math.min(currentPSMap[mapToP[id][0]],currentPSMap[mapToP[id][1]])
        return currentPSMap
    }
    getDepthLeaves(dict, id, depth, tree = {}){
        var amount = 0
        for (var i = 0; i < dict[id].length; i++){
            if (dict[dict[id][i]] == null || depth == 1){
                amount += 1
                tree[dict[id][i]] = 1
                continue;
            }
            tree = this.getDepthLeaves(dict, dict[id][i], depth-1, tree)
            amount += tree[dict[id][i]]
        }
        tree[id] = amount
        return tree
    }

    getLineDict(currentId, rect, count, xy, bi = false){
        var results = []
        var layers = []
        var ids = []
        var areas = []
        var pos = []
        if (this.pg.map[currentId] == null) return {result: [], layer: [], id: [], area: [], pos: []}
        var children = this.pg.map[currentId].length
        var intervalW = rect.rect.width, intervalH = rect.rect.height,
            useW = 0, useH = 0,
            offsetW = 0, offsetH = 0;
        if (rect.rect.width < rect.rect.height){
            useH = 1;
        } else {
            useW = 1;
        }
        for (var ratio, line, i = 0; i < children; i++ ){
            ratio = parseInt(this.pg.leaves[this.pg.map[currentId][i]]) / parseInt(this.pg.leaves[currentId])
            if (bi) ratio = 0.5
            if (useH) intervalH = rect.rect.height * ratio
            else if (useW) intervalW = rect.rect.width * ratio
    
            var newRect = {center: {x: rect.center.x+offsetW+intervalW*0.5, y: rect.center.y+offsetH+intervalH*0.5}, rect: {width: intervalW, height: intervalH}}
            offsetH +=intervalH*useH
            offsetW +=intervalW*useW
            line = {a:{x: rect.center.x+offsetW, y: rect.center.y+offsetH},b:{x: rect.center.x+offsetW+rect.rect.width*useH, y: rect.center.y+offsetH+rect.rect.height*useW}}
            if (i == children -1) line = null
            results.push(line);
            layers.push(count+1);
            ids.push(this.pg.map[currentId][i]);
            areas.push(newRect)
            pos.push({x: xy.x, y: xy.y})
        }
        
        offsetW = 0
        offsetH = 0
        for(var ratio, i = 0; i < children; i++){
            var cF = i * 2**Math.floor((this.pg.depth - count)/2)
            if (cF < 0 ) cF = 0
            ratio = parseInt(this.pg.leaves[this.pg.map[currentId][i]]) / parseInt(this.pg.leaves[currentId])
            if (bi) ratio = 0.5
            if (useH) intervalH = rect.rect.height * ratio
            else if (useW) intervalW = rect.rect.width * ratio
    
            var childLineDict = this.getLineDict(this.pg.map[currentId][i],{center:{x: rect.center.x+offsetW, y: rect.center.y+offsetH}, rect:{width: intervalW, height: intervalH}}, count+1, {x: xy.x+(useW*cF/2), y: xy.y+(useH*cF)}, bi);
            offsetH +=intervalH*useH
            offsetW +=intervalW*useW
    
            Array.prototype.push.apply(results, childLineDict.result);
            Array.prototype.push.apply(layers, childLineDict.layer);
            Array.prototype.push.apply(ids, childLineDict.id);
            Array.prototype.push.apply(areas, childLineDict.area);
            Array.prototype.push.apply(pos, childLineDict.pos);
        }
        return {result: results, layer: layers, id: ids, area: areas, pos: pos}
    }
    
    getRectDict(currentId, rect, count, xy, bi = false){
        var results = []
        var layers = []
        var ids = []
        var pos = []
        if (this.pg.map[currentId] == null) return {result: [{center:{x:rect.center.x+rect.rect.width/2,y:rect.center.y+rect.rect.height/2}, rect:rect.rect}], layer: [count], id: [currentId], pos: [xy]}
        var children = this.pg.map[currentId].length
        var intervalW = rect.rect.width, intervalH = rect.rect.height,
            useW = 0, useH = 0,
            offsetW = 0, offsetH = 0;
        if (rect.rect.width < rect.rect.height){
            useH = 1;
        } else {
            useW = 1;
        }
        for (var ratio, line, newRect, i = 0; i < children; i++ ){
            if (count != this.pg.depth-1) continue;

            ratio = parseInt(this.pg.leaves[this.pg.map[currentId][i]]) / parseInt(this.pg.leaves[currentId])
            if (bi) ratio = 0.5
            if (useH) intervalH = rect.rect.height * ratio
            else if (useW) intervalW = rect.rect.width * ratio
            
            newRect = {center: {x: rect.center.x+offsetW+intervalW*0.5, y: rect.center.y+offsetH+intervalH*0.5}, rect: {width: intervalW, height: intervalH}}
            offsetH +=intervalH*useH
            offsetW +=intervalW*useW
            results.push(newRect);
            layers.push(count+1);
            ids.push(this.pg.map[currentId][i]);
            pos.push({x: xy.x, y: xy.y})
        }
        
        offsetW = 0
        offsetH = 0
        for(var ratio, i = 0; i < children; i++){
            var cF = i * 2**Math.floor((this.pg.depth - count)/2)
            if (cF < 0 ) cF = 0
            ratio = parseInt(this.pg.leaves[this.pg.map[currentId][i]]) / parseInt(this.pg.leaves[currentId])
            if (bi) ratio = 0.5
            if (useH) intervalH = rect.rect.height * ratio
            else if (useW) intervalW = rect.rect.width * ratio
    
            if (this.pg.map[this.pg.map[currentId][i]] == null) {
                offsetH +=intervalH*useH
                offsetW +=intervalW*useW
                continue;
            }
    
            var childLineDict = this.getRectDict(this.pg.map[currentId][i],{center:{x: rect.center.x+offsetW, y: rect.center.y+offsetH}, rect:{width: intervalW, height: intervalH}}, count+1, {x: xy.x+(useW*cF/2), y: xy.y+(useH*cF)}, bi);
            offsetH +=intervalH*useH
            offsetW +=intervalW*useW
    
            Array.prototype.push.apply(results, childLineDict.result);
            Array.prototype.push.apply(layers, childLineDict.layer);
            Array.prototype.push.apply(ids, childLineDict.id);
            Array.prototype.push.apply(pos, childLineDict.pos);
        }
        return {result: results, layer: layers, id: ids, pos: pos}
    }
    
    getIcicleDict(currentId, rect, count, bi = false){
        var results = count == 0 ? [rect] : []
        var layers = count == 0 ? [0] : []
        var ids = count == 0 ? [currentId] : []
        if (this.pg.map[currentId] == null) return {result: [{center:{x:rect.center.x+rect.rect.width/2,y:rect.center.y+rect.rect.height/2}, rect:rect.rect}], layer: [count], id: [currentId]}
        var children = this.pg.map[currentId].length
        var intervalW = rect.rect.width, intervalH = rect.rect.height,
            useW = 0, useH = 0,
            offsetW = 0, offsetH = 0;
            
        for (var ratio, line, newRect, i = 0; i < children; i++ ){
            ratio = parseInt(this.pg.leaves[this.pg.map[currentId][i]]) / parseInt(this.pg.leaves[currentId])
            if (bi) ratio = 0.5
            intervalH = rect.rect.height * 0.6
            intervalW = rect.rect.width * ratio
            
            newRect = {center: {x: rect.center.x+offsetW-rect.rect.width*0.5+intervalW*0.5, y: rect.center.y+rect.rect.height*0.5+intervalH*0.5}, rect: {width: intervalW, height: intervalH}}
            offsetH +=intervalH*useH
            offsetW +=intervalW
            results.push(newRect);
            layers.push(count+1);
            ids.push(this.pg.map[currentId][i]);
        }
        
        offsetW = 0
        offsetH = 0
        for(var ratio, i = 0; i < children; i++){
            ratio = parseInt(this.pg.leaves[this.pg.map[currentId][i]]) / parseInt(this.pg.leaves[currentId])
            if (bi) ratio = 0.5
            intervalH = rect.rect.height * 0.6
            intervalW = rect.rect.width * ratio
    
            if (this.pg.map[this.pg.map[currentId][i]] == null) {
                offsetH +=intervalH*useH
                offsetW +=intervalW
                continue;
            }
    
            var childLineDict = this.getIcicleDict(this.pg.map[currentId][i],{center:{x: rect.center.x+offsetW-rect.rect.width*0.5+intervalW*0.5, y: rect.center.y+rect.rect.height*0.5+intervalH*0.5}, rect:{width: intervalW, height: intervalH}}, count+1, bi);
            offsetH +=intervalH*useH
            offsetW +=intervalW
    
            Array.prototype.push.apply(results, childLineDict.result);
            Array.prototype.push.apply(layers, childLineDict.layer);
            Array.prototype.push.apply(ids, childLineDict.id);
        }
        return {result: results, layer: layers, id: ids}
    }
    
    makePath(svg, rect){
        var a = {x: rect.center.x-rect.rect.width/2, y: rect.center.y-rect.rect.height/2}
        var b = {x: rect.center.x+rect.rect.width/2, y: rect.center.y-rect.rect.height/2}
        var c = {x: rect.center.x+rect.rect.width/2, y: rect.center.y+rect.rect.height/2}
        var d = {x: rect.center.x-rect.rect.width/2, y: rect.center.y+rect.rect.height/2}
        return svg.append('path')
            .attr('stroke', 'none')
            .attr('fill', 'none')
            .attr('d', `M${a.x},${a.y}L${b.x},${b.y}L${c.x},${c.y}L${d.x},${d.y}L${a.x},${a.y}`)
        return svg.append('circle').attr('cx', rect.center.x).attr('cy', rect.center.y).attr('r', rect.rect.width/6).attr('stoke', 'none')
    }
    
    makeCircle(svg, rect){
        return svg.append('circle').attr('cx', rect.center.x).attr('cy', rect.center.y).attr('r', rect.rect.width/6).attr('stoke', 'none').attr('fill', 'none')
    }
}
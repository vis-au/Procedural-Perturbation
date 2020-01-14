var disturbance = 20;
var maxPert = 0.2;
var joints = 9;
var sigmaInput = 0.33;
var muInput = 0.5;
var minInput = 5;
var maxInput = 10;
var minRangeInput = 16;
var maxRangeInput = 32;
var pngInput = "";
var rectStyle = false;
var transStyle = false;
var useLargest = false;
let distType = distributions.UNIFORM;
let interType = interpolations.LINE;
let interOrder = interpolationOrders.SORT;
let widthType = widthTypes.CONSTANT;
var ged = null;
var root = 133
var lblRoot = "Root id: 133"

// const { XYFrame } = Semiotic
const parse = parseGedcom
//const { getData, strokeToFill} = this['gradient-path']

window.onload = function() {
    var center = d3.select('body').append('center')
    
    var width = 500;
    var height = 500;

    // create selector
    center.append('div').text('Distribution');
    var dSelType = center.append('select');
    dSelType.id = "dSelType";
    //var options = ["Squiggly","Sketchy","Wavy","Loopy","Edgy","Overdraw","Dashing"];
    this.makeEnum(distributions);
    distributions.all.forEach(function(d,i){
        dSelType
        .append("option")
        .attr("value",d)
        .text(d);
    })
    // create input
    var lblSigma = center.append('div').text('sigma')
        .style('display', 'none')
    var sliSigma = center.append('input')
    var sliNSigma = sliSigma.node();
    sliNSigma.id = "max";
    sliNSigma.type = 'range';
    sliNSigma.min = 0;
    sliNSigma.max = 0.33;
    sliNSigma.value = 0.33;
    sliNSigma.step = 0.03;
    sliSigma.style('display', 'none')
    sliSigma.on('change', function(){
        sigmaInput = parseFloat(this.value);
        lblSigma.text('sigma: '+this.value)
    })
    // create input
    var lblMu = center.append('div').text('mu')
        .style('display', 'none')
    var sliMu = center.append('input')
    var sliNMu = sliMu.node();
    sliNMu.id = "max";
    sliNMu.type = 'range';
    sliNMu.min = 0;
    sliNMu.max = 1;
    sliNMu.value = 0.5;
    sliNMu.step = 0.05;
    sliMu.style('display', 'none')
    sliMu.on('change', function(){
        muInput = parseFloat(this.value);
        lblMu.text('mu: '+this.value)
    })
    dSelType.on('change', function(){
        distType = this.value;//d3.select(this).property('value');
        if (distType == distributions.GAUSSIAN || distType == distributions.INVERSEGAUSSIAN){
            sliMu.style('display', 'block')
            sliSigma.style('display', 'block')
            lblMu.style('display', 'block')
            lblSigma.style('display', 'block')
        } else{
            sliMu.style('display', 'none')
            sliSigma.style('display', 'none')
            lblMu.style('display', 'none')
            lblSigma.style('display', 'none')
        }
    })
    center.append('br');
    center.append('br');


    center.append('div').text('Interpolation');
    var olSelType = center.append('select');
    olSelType.id = "olSelType";
    this.makeEnum(interpolations);
    interpolations.all.forEach(function(d,i){
        olSelType
        .append("option")
        .attr("value",d)
        .text(d);
    })
    olSelType.on('change', function(){
        interType = this.value;//d3.select(this).property('value');
    })
    center.append('br');
    center.append('br');

    center.append('div').text('Interpolation order');
    var cSelType = center.append('select');
    cSelType.id = "cSelType";
    this.makeEnum(interpolationOrders);
    interpolationOrders.all.forEach(function(d,i){
        cSelType
        .append("option")
        .attr("value",d)
        .text(d);
    })
    cSelType.on('change', function(){
        interOrder = this.value;//d3.select(this).property('value');
    })
    center.append('br');
    center.append('br');

    center.append('div').text('Stroke width');
    var tSelType = center.append('select');
    tSelType.id = "tSelType";
    this.makeEnum(widthTypes);
    widthTypes.all.forEach(function(d,i){
        tSelType
        .append("option")
        .attr("value",d)
        .text(d);
    })
    // create input
    var lblMin = center.append('div').text('min')
        // .style('display', 'none')
    var sliMin = center.append('input')
    var sliNMin = sliMin.node();
    sliNMin.id = "min";
    sliNMin.type = 'range';
    sliNMin.min = 1;
    sliNMin.max = 5;
    sliNMin.value = 5;
    sliNMin.step = 0.1;
    // sliMin.style('display', 'none')
    sliMin.on('change', function(){
        minInput = parseFloat(this.value);
        lblMin.text('min: '+this.value)
    })
    // create input
    var lblMax = center.append('div').text('max')
        .style('display', 'none')
    var sliMax = center.append('input')
    var sliNMax = sliMax.node();
    sliNMax.id = "max";
    sliNMax.type = 'range';
    sliNMax.min = 5;
    sliNMax.max = 10;
    sliNMax.value = 10;
    sliNMax.step = 0.1;
    sliMax.style('display', 'none')
    sliMax.on('change', function(){
        maxInput = parseFloat(this.value);
        lblMax.text('max: '+this.value)
    })
    // create input
    var lblMinRange = center.append('div').text('minRange')
        .style('display', 'none')
    var sliMinRange = center.append('input')
    var sliNMinRange = sliMinRange.node();
    sliNMinRange.id = "minRange";
    sliNMinRange.type = 'range';
    sliNMinRange.min = 4;
    sliNMinRange.max = 16;
    sliNMinRange.value = 16;
    sliNMinRange.step = 1;
    sliMinRange.style('display', 'none')
    sliMinRange.on('change', function(){
        minRangeInput = parseInt(this.value);
        lblMinRange.text('minRange: '+this.value)
    })
    // create input
    var lblMaxRange = center.append('div').text('maxRange')
        .style('display', 'none')
    var sliMaxRange = center.append('input')
    var sliNMaxRange = sliMaxRange.node();
    sliNMaxRange.id = "maxRange";
    sliNMaxRange.type = 'range';
    sliNMaxRange.min = 16;
    sliNMaxRange.max = 48;
    sliNMaxRange.value = 32;
    sliNMaxRange.step = 1;
    sliMaxRange.style('display', 'none')
    sliMaxRange.on('change', function(){
        maxRangeInput = parseInt(this.value);
        lblMaxRange.text('maxRange: '+this.value)
    })
    tSelType.on('change', function(){
        widthType = this.value;//d3.select(this).property('value');
        if (widthType == widthTypes.DEVIATE || widthType == widthTypes.ONE){
            // sliMin.style('display', 'block')
            sliMax.style('display', 'block')
            // lblMin.style('display', 'block')
            lblMax.style('display', 'block')
        } else {
            // sliMin.style('display', 'none')
            sliMax.style('display', 'none')
            // lblMin.style('display', 'none')
            lblMax.style('display', 'none')
        }
        if (widthType == widthTypes.DEVIATE){
            sliMinRange.style('display', 'block')
            sliMaxRange.style('display', 'block')
            lblMinRange.style('display', 'block')
            lblMaxRange.style('display', 'block')
        } else {
            sliMinRange.style('display', 'none')
            sliMaxRange.style('display', 'none')
            lblMinRange.style('display', 'none')
            lblMaxRange.style('display', 'none')
        }
    })
    center.append('br');
    center.append('br');

    // create slider
    var lblJ = center.append('div').text('Joints');
    var sliJ = center.append('input');
    var sliNJ = sliJ.node();
    sliNJ.id = "Joints";
    sliNJ.type = 'range';
    sliNJ.min = 0; // 2
    sliNJ.max = 30; // 50
    sliNJ.value = 10; // 10
    sliNJ.step = 2; // 1
    sliJ.on('change', function () {
        joints = parseInt(this.value);
        // jInt = parseInt(this.value)
        lblJ.text('Joints: '+joints)
    })
    center.append('br');
    center.append('br');
    
    // create slider
    center.append('div').text('Amplification');
    var sliP = center.append('input');
    var sliNP = sliP.node();
    sliNP.id = "Perturbation";
    sliNP.type = 'range';
    sliNP.min = 0;
    sliNP.max = 0.8;
    sliNP.value = 0.2;
    sliNP.step = 0.11;
    sliP.on('change', function () {
        pInt = this.value
        // minPert = 1-0.4+0.035*parseInt(this.value), 
        maxPert = parseFloat(this.value);
    })
    center.append('br');
    center.append('br');
    // create Btn
    var btnStyle = center.append('button');
    var btnNStyle = btnStyle.node();
    btnNStyle.id = 'btnTranslate';
    btnNStyle.innerText = "Line style"
    btnStyle.on('click', function () {
        rectStyle = !rectStyle;
        btnNStyle.innerText = (rectStyle ? "Rect" : "Line") + " style";
    })
    // create Btn
    var btnTStyle = center.append('button');
    var btnNTStyle = btnTStyle.node();
    btnNTStyle.id = 'btnTranslate';
    btnNTStyle.innerText = "Params"
    btnTStyle.on('click', function () {
        transStyle = !transStyle;
        btnNTStyle.innerText = (transStyle ? "Trans" : "Params");
    })
    // create Btn
    var btnTreemap = center.append('button');
    var btnNTreemap = btnTreemap.node();
    btnNTreemap.id = 'btnTreemap';
    btnNTreemap.innerText = "Create treemap"
    // create Btn
    var btnIcicle = center.append('button');
    var btnNIcicle = btnIcicle.node();
    btnNIcicle.id = 'btnIcicle';
    btnNIcicle.innerText = "Create icicle plot"
    center.append('br');
    center.append('br');


    var svgged = center.append("svg")
        .attr('height', height).attr('width', width)

    var vis = new PerturbGEDCOM(svgged, royalGED)
    btnTreemap.on('click', function () {
        // if (ged == null) return null;
        // svgged.selectAll('*').remove();
        // console.log(ged.nodes[root].name)
        // var pedigreeGraph = buildPedigreeGraph(ged, useLargest ? -1 : root)
        // var target = perturbGEDCOM(svgged, pedigreeGraph, joints, maxPert, {name: '', length: 10, o: 0, iO: interOrder, dT: distType, iT: interType, wT: widthType, mu: muInput, sigma: sigmaInput, min: minInput, max: maxInput, minRange: minRangeInput, maxRange: maxRangeInput}, rectStyle, false, true)
        // buildPedigreeGraph(svgged, ged, root, joints, maxPert, rectStyle, {name: '', length: 10, o: 0, iO: interOrder, dT: distType, iT: interType, wT: widthType, mu: muInput, sigma: sigmaInput, min: minInput, max: maxInput, minRange: minRangeInput, maxRange: maxRangeInput}, useLargest, false, true);
        // var vis = new perturbGEDCOM(svgged, royalGED)
        vis.Perturb({joints: joints,
                    maxPert: maxPert,
                    rectStyle: rectStyle,
                    useRandom: transStyle,
                    isTreemap: true,
                    o: 0,
                    params: {
                        dT: distType,
                        iO: interOrder,
                        iT: interType,
                        wT: widthType,
                        length: 10,
                        seed: SeededRandom.getSeed(10),
                        rectSeed: SeededRandom.getSeed(10),
                        min: minInput,
                        max: maxInput,
                        minRange: minRangeInput,
                        maxRange: maxRangeInput,
                        sigma: sigmaInput,
                        mu: muInput,
                        acen: 0,
                    }})
    })
    btnIcicle.on('click', function () {
        // if (ged == null) return null;
        // svgged.selectAll('*').remove();
        // console.log(ged.nodes[root].name)
        // var pedigreeGraph = buildPedigreeGraph(ged, useLargest ? -1 : root)
        // var target = perturbGEDCOM(svgged, pedigreeGraph, joints, maxPert, {name: '', length: 10, o: 0, iO: interOrder, dT: distType, iT: interType, wT: widthType, mu: muInput, sigma: sigmaInput, min: minInput, max: maxInput, minRange: minRangeInput, maxRange: maxRangeInput}, rectStyle, false, false)
        // buildPedigreeGraph(svgged, ged, root, joints, maxPert, rectStyle, {name: '', length: 10, o: 0, iO: interOrder, dT: distType, iT: interType, wT: widthType, mu: muInput, sigma: sigmaInput, min: minInput, max: maxInput, minRange: minRangeInput, maxRange: maxRangeInput}, useLargest, false, false);
        
        vis.Perturb({joints: joints,
                    maxPert: maxPert,
                    rectStyle: rectStyle,
                    useRandom: transStyle,
                    isTreemap: false,
                    o: 0,
                    params: {
                        dT: distType,
                        iO: interOrder,
                        iT: interType,
                        wT: widthType,
                        length: 10,
                        seed: SeededRandom.getSeed(10),
                        rectSeed: SeededRandom.getSeed(10),
                        min: minInput,
                        max: maxInput,
                        minRange: minRangeInput,
                        maxRange: maxRangeInput,
                        sigma: sigmaInput,
                        mu: muInput,
                        acen: 0,
                    }})
    })
}
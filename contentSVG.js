var maxPert = 0.2;
var joints = 10; 
var sigmaInput = 0.33;
var muInput = 0.5;
var minInput = 5;
var maxInput = 10;
var minRangeInput = 16;
var maxRangeInput = 32;
var svgInput = "";
var pngInput = "";
let distType = distributions.UNIFORM;
let interType = interpolations.LINE;
let interOrder = interpolationOrders.SORT;
let widthType = widthTypes.CONSTANT;
var svgData = ""
var vis = null

window.onload = function() {
    var center = d3.select('body').append('center')
    // create input
    center.append('div').text('HTTP/URL of SVG to load');
    var inpHttpSVG = center.append('input')
        .text(function(d) { return d; });
    inpHttpSVG.node().id = 'htmlSVG';
    inpHttpSVG.on('change', function(){
        svgInput = this.value;
    })

    // create Btn
    var btnHttpSVG = center.append('button');
    btnHttpSVG.node().id = 'btnSVG';
    btnHttpSVG.text("submit");
    center.append('div').text('Example SVG: https://upload.wikimedia.org/wikipedia/commons/8/8e/Histogram_example.svg');
    center.append('div').text('The parts that can be perturbed are not shown');
    center.append('div').text('Error: currently pressing "Perturb SVG" does not show the SVG, but it can be copied from the inspector into a file');
    // create svg
    var width = 500;
    var height = 500;
    var svg = center
        .append("svg")

    btnHttpSVG.on("click", function () {
        // load url svg into svg
        if (svgInput == "") return;
        d3.xml(svgInput)
            .then(data => {
                svgData = data.documentElement
                svg.selectAll('*').remove()
                vis = new PerturbSVG(svg, svgData)
            })
    })
    center.append('br');

    // create Btn
    var btnGenSVG = center.append('button');
    var btnNGenSVG = btnGenSVG.node();
    btnNGenSVG.id = 'btnGenSVG';
    btnNGenSVG.innerText = "Perturb SVG";
    center.append('br');
    center.append('br');

    
    // create selector
    center.append('div').text('Distribution');
    var dSelType = center.append('select');
    dSelType.id = "dSelType";
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
        distType = this.value;
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
        interType = this.value;
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
        interOrder = this.value;
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
        .style('display', 'none')
    var sliMin = center.append('input')
    var sliNMin = sliMin.node();
    sliNMin.id = "min";
    sliNMin.type = 'range';
    sliNMin.min = 5;
    sliNMin.max = 10;
    sliNMin.value = 10;
    sliNMin.step = 0.1;
    sliMin.style('display', 'none')
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
    sliNMax.min = 2;
    sliNMax.max = 5;
    sliNMax.value = 5;
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
        widthType = this.value;
        if (widthType == widthTypes.DEVIATE || widthType == widthTypes.ONE){
            sliMin.style('display', 'block')
            sliMax.style('display', 'block')
            lblMin.style('display', 'block')
            lblMax.style('display', 'block')
        } else {
            sliMin.style('display', 'none')
            sliMax.style('display', 'none')
            lblMin.style('display', 'none')
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
        joints = parseInt(this.value)//2+parseInt(3.5*parseInt(this.value));
        // jInt = parseInt(this.value)
        lblJ.text('Joints: '+ joints)
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
    sliNP.step = 0.1;
    sliP.on('change', function () {
        maxPert = parseFloat(this.value);
    })
    center.append('br');
    center.append('br');

    btnGenSVG.on('click', function () {
        if (vis != null) {
            vis.Perturb({j: joints,
                                    p: maxPert*20,
                                    o: 0,
                                    distType: distType,
                                    intOrder: interOrder,
                                    intType: interType,
                                    wType: widthType,
                                    seed: SeededRandom.getSeed(10),
                                    length: 10,
                                    params: {
                                        rectSeed: SeededRandom.getSeed(10),
                                        dist:{
                                            sigma: sigmaInput,
                                            mu: muInput,
                                        },
                                        width:{
                                            min: minInput,
                                            max: maxInput,
                                            minRange: minRangeInput,
                                            maxRange: maxRangeInput,
                                        }
                                    },
                                    acen: 0,
                                })
        }
            
    })

    
    // // create input
    // center.append('div').text('Save SVG as png with name:');
    // var inpPNGSVG = center.append('input')
    //     .text(function(d) { return d; });
    //     inpPNGSVG.node().id = 'htmlPNG';
    //     inpPNGSVG.on('change', function(){
    //     pngInput = this.value;
    // })

    // // create Btn
    // var btnSaveTreemap = center.append('button');
    // var btnNSaveTreemap = btnSaveTreemap.node();
    // btnNSaveTreemap.id = 'btnSaveTreemap';
    // btnNSaveTreemap.class = 'button'
    // btnNSaveTreemap.innerText = "Save SVG";
    
    // btnSaveTreemap.on('click', function () {
    //     var svgString = getSVGString(svg.node());
    //     svgString2Image( svgString, 2*width, 2*height, 'png', save ); // passes Blob and filesize String to the callback
    
    //     function save( dataBlob, filesize ){
    //         saveAs( dataBlob, `${pngInput}.png` ); // FileSaver.js function
    //     }
    // })
}
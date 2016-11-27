var config = {
    title:'',
    description:'Select a country below to see the breakdown of activities.',
    dataURL:'https://beta.proxy.hxlstandard.org/data.json?strip-headers=on&url=https%3A//docs.google.com/spreadsheets/d/1VVIO5avDBZ5W_nDGNHK-0axcvKuedeZnnM_EtuTAwEs/edit%3Fusp%3Dsharing&force=on',
    geoURL:'data/nrc.json',
    geoName:'NAME',
    geoTag:'#country',
    aggTag:'#sector',
    charts:[['#reached+male','#targeted+male'],['#reached+female','#targeted+female'],['#reached+total','#targeted+total']],
    titles:['Males','Females','Total'],
    mainColor:'#ff6600',
    secondaryColor:'#ff3300'
}

function generateDashboard(config,data,geom){
    var baselayer = L.tileLayer('https://data.hdx.rwlabs.org/mapbox-base-tiles/{z}/{x}/{y}.png', {});
    var baselayer2 = L.tileLayer('https://data.hdx.rwlabs.org/mapbox-layer-tiles/{z}/{x}/{y}.png', {minZoom:4});

    map = L.map('map',{
                center: [7,40],
                zoom: 4,
                layers: [baselayer,baselayer2]
            });

    map.overlay = L.geoJson(geom,{
        onEachFeature:onEachFeature,
        style:style
        }).addTo(map);

    var info = L.control();

    info.onAdd = function (map) {
        this._div = L.DomUtil.create('div', 'info');
        this.update();
        return this._div;
    };

    info.update = function (props) {
        this._div.innerHTML = (props ? props[config.geoName] : 'Hover location for details');
    };

    info.addTo(map);    

    renderCharts(data,'All');

    function style(feature) {
        return {
                'color': config.mainColor,
                'fillcolor': config.mainColor,
                'weight':1,
                'className': feature.properties[config.geoName].toLowerCase().replace(' ','_')+' country'
            }
    }

    function onEachFeature(feature, layer) {
        layer.on({
            click:function(){
                d3.selectAll('.country').attr('fill',config.mainColor);
                d3.selectAll('.'+feature.properties[config.geoName].toLowerCase().replace(' ','_')).attr('fill',config.secondaryColor);
                renderCharts(data,feature.properties[config.geoName]);
            },
            mouseover: highlightFeature,
            mouseout: resetHighlight
        });
    }

    function highlightFeature(e) {
        info.update(e.target.feature.properties);
    }

    function resetHighlight(e) {
        info.update();
    }

}

function renderCharts(data,geoFilter){
    var agg = config.aggTag;
    if(geoFilter!='All'){
        $('#charttitle').html('<h4><a id="allfilter">All countries</a> > '+geoFilter+'</h4>');
        $('#allfilter').on('click',function(e){
            d3.selectAll('.country').attr('fill',config.mainColor);
            renderCharts(data,'All');
        });
    } else {
        $('#charttitle').html('<h4>All countries</h4>');
        agg = config.geoTag;
    }
    var tags = [].concat.apply([], config.charts);
    var processedData = {};
    var texcess = [];
    totals={};
    tags.forEach(function(t){
        totals[t]=0
    });
    data.forEach(function(d){
        if(d[config.geoTag]==geoFilter || geoFilter=='All'){
            config.charts.forEach(function(c,i){
                totals[c[0]] += Math.min(parseInt(d[c[0]]),parseInt(d[c[1]]));
                totals[c[1]] += parseInt(d[c[1]]);
                texcess[i] = 0;
            });
            if(processedData[d[agg]]==undefined){
                processedData[d[agg]] = {excess:[]};
                config.charts.forEach(function(c,i){
                    processedData[d[agg]][c[0]] = Math.min(parseInt(d[c[0]]),parseInt(d[c[1]]));
                    processedData[d[agg]][c[1]] = parseInt(d[c[1]]);
                    if(i<config.charts.length-1){
                        processedData[d[agg]].excess[i] = Math.max(0,parseInt(d[c[0]])-parseInt(d[c[1]]));
                    } else {
                        processedData[d[agg]].excess[i] = processedData[d[agg]].excess[0] + processedData[d[agg]].excess[1];
                    }
                });
                
            } else {
                config.charts.forEach(function(c,i){
                    processedData[d[agg]][c[0]] += Math.min(parseInt(d[c[0]]),parseInt(d[c[1]]));
                    processedData[d[agg]][c[1]] += parseInt(d[c[1]]);
                    if(i<config.charts.length-1){
                        processedData[d[agg]].excess[i] += Math.max(0,parseInt(d[c[0]])-parseInt(d[c[1]]));
                    } else {
                        processedData[d[agg]].excess[i] = processedData[d[agg]].excess[0] + processedData[d[agg]].excess[1];
                    }
                });
            }
        }
    });
    pdata = []
    for(key in processedData){
        processedData[key][agg] = key;
        var zero = false;
        config.charts.forEach(function(c){
            if(processedData[key][c[1]]==0){
                zero=true;
            }
        });
        if(zero==false){
            pdata.push(processedData[key]);
        }
    }
    pdata.forEach(function(d){
        d.excess.forEach(function(e,i){
            texcess[i]+=e;
        });
    });
    $('#charts').html();
    length = 12/(config.charts.length+1);
    var html = '<div class="row"><div class="col-md-'+length+'"></div>';
    config.charts.forEach(function(c,i){
        html += '<div class="col-md-'+length+'"><h4>'+config.titles[i]+'</h4></div>';
    });
    html +='</div>';
    pdata.forEach(function(d,i){
        html +='<div id="charts'+i+'" class="row chartrow"><div id="title'+i+'" class="col-md-'+length+'"></div>';
        config.charts.forEach(function(c,i2){
            html+='<div id="charts'+i+'_'+i2+'" class="col-md-'+length+'"></div>';
        });
        html +='</div>';
    });
    $('#charts').html(html);
    
        
    pdata.forEach(function(d,di){
        var images = {'Food Security':'food_security.png',
                    'WASH':'wash.png',
                    'Shelter':'shelter.png',
                    'Education':'education.png',
                    'ICLA':'legal.png',
                    'CCCM':'cccm.png',
                    'Protection':'protection.png'}
        if(images[d[agg]]!=undefined){
            var image = '<img class="icon" heigth="48" width="48" src="images/'+images[d[agg]]+'">';
        } else {
            var image = '';
        }
        $('#title'+di).html('<h4>'+d[agg]+'</h4>'+image);
        config.charts.forEach(function(c,i){
            pieChart('#charts'+di+'_'+i,d[c[0]],d[c[1]],d.excess[i]);
        });
    });
    if(geoFilter=='All'){
        geoFilter = 'All Countries'
    }
    length = 12/(config.charts.length);
    $('#total').html('<h4>Totals for '+geoFilter+'</h4>');
    config.charts.forEach(function(c,i){
        $('#total').append('<div id="total'+i+'" class="col-md-'+length+'">' + config.titles[i] + '<p></p></div>');
        pieChart('#total'+i,totals[c[0]],totals[c[1]],texcess[i]);
    });
    $('#total').append('<p>Totals show the sum of the clusters.  The actual total of unique beneficiares may be smaller as some clusters serve the same beneficiaries.')

}

function pieChart(id,partial,whole,excess){
            var width = $(id).width()
            var radius = Math.min(width,80)/2;
            var inner = Math.min(width,100)*0.15;
            var svg = d3.select(id).append("svg")
                .attr("width", width)
                .attr("height",radius*2);


            if(whole>0){
                var partialArc = d3.svg.arc()
                    .innerRadius(radius-inner)
                    .outerRadius(radius)
                    .startAngle(0)
                    .endAngle(Math.PI*2*partial/whole);

                var totalArc = d3.svg.arc()
                    .innerRadius(radius-inner)
                    .outerRadius(radius)
                    .startAngle(0)
                    .endAngle(Math.PI*2);

                svg.append("path")
                    .style("fill", "#dfdfdf")
                    .attr("d", totalArc)
                    .attr("transform", "translate("+(radius)+","+(radius)+")");

                svg.append("path")
                    .style("fill", config.mainColor)
                    .attr("d", partialArc)
                    .attr("transform", "translate("+(radius)+","+(radius)+")");

                svg.append("text")
                    .attr("x",radius)
                    .attr("y",radius+5)
                    .text(d3.format(".0%")(partial/whole))
                    .style("text-anchor", "middle");
                format = d3.format("0,000");
                $(id).append('<p class="figure">Reached: '+format(partial)+'</p><p class="figure">Targeted: '+format(whole)+'</p><p class="figure">Above targets: '+format(excess)+'</p>');
            }
}

function hxlProxyToJSON(input,headers){
    var output = [];
    var keys=[]
    input.forEach(function(e,i){
        if(i==0){
            e.forEach(function(e2,i2){
                var parts = e2.split('+');
                var key = parts[0]
                if(parts.length>1){
                    var atts = parts.splice(1,parts.length);
                    atts.sort();                    
                    atts.forEach(function(att){
                        key +='+'+att
                    });
                }
                keys.push(key);
            });
        } else {
            var row = {};
            e.forEach(function(e2,i2){
                row[keys[i2]] = e2;
            });
            output.push(row);
        }
    });
    return output;
}

function unique(arr) {
    var u = {}, a = [];
    for(var i = 0, l = arr.length; i < l; ++i){
        if(!u.hasOwnProperty(arr[i])) {
            a.push(arr[i]);
            u[arr[i]] = 1;
        }
    }
    return a;
}

var map;

$('#title').html(config.title);
$('#description').html(config.description);
//load data

var dataCall = $.ajax({ 
    type: 'GET', 
    url: config.dataURL, 
    dataType: 'json',
});

//load geometry

var geomCall = $.ajax({ 
    type: 'GET', 
    url: config.geoURL, 
    dataType: 'json',
});

//when both ready construct dashboard

$.when(dataCall, geomCall).then(function(dataArgs, geomArgs){
    var geom = topojson.feature(geomArgs[0],geomArgs[0].objects.nrc);
    var data = hxlProxyToJSON(dataArgs[0]);
    var countries = unique(data.map(function(d){
        return d[config['geoTag']];
    }));
    console.log(countries);
    for (var i = geom.features.length-1; i >= 0; i--) {
        if (countries.indexOf(geom.features[i].properties[config['geoName']])==-1) {
            geom.features.splice(i, 1);
        }
    }
    generateDashboard(config,data,geom);
});
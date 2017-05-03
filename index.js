
// dataiku.setAPIKey('DEAN9In6cRUM6QDBDQRY8RAMBhhUOtxP');
// dataiku.setDefaultProjectKey('DATACITY');


console.log('STARTING');
// Create a Map
var map = L.map('map');
map.setView([48.850, 2.35], 12.);

// Croulebarbe zoom: map.setView([48.830, 2.35], 14.);


// Add an OpenStreetMap(c) based background
var cartodb =  new  L.tileLayer(
    'http://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', {
    attribution: ''
})
map.addLayer(cartodb);


// Global vars
var iris_geometries_raw;
var data_par_iris;
var selected_iris;


function main(){
    $('#myModal').modal('show');
    load_iris_geometries();
    load_data_par_iris();
    update_infos_and_graphics();
};


function convert_string_to_array(string_array) {
    // converti une chaine de caractere en array
    // "1, 2, 3" -> [1, 2, 3]
    return jQuery.parseJSON("[" + string_array + "]");
}

function load_data_par_iris() {
  console.log('REQUESTING DATA');
  function row_parser(row) {
    row['flow_array'] = convert_string_to_array(row['flow_array']);
    row['hour_array'] = convert_string_to_array(row['hour_array']);
    row['puissance_array'] = convert_string_to_array(row['puissance_array']);
    return row;
  }
  d3.request("data/dataset_webapp.csv")
    .mimeType("text/csv")
    .response(function(xhr) {
      var parser = d3.dsvFormat('|');
      return parser.parse(xhr.responseText, row_parser);
    })
    .get(function(data){
      data_par_iris = data;
    });
}

function load_iris_geometries() {
  console.log('REQUESTING DATA');
  d3.request("data/iris_centroids.csv")
    .mimeType("text/csv")
    .response(function(xhr) {
      var parser = d3.dsvFormat('|');
      return parser.parse(xhr.responseText);
    })
    .get(function(data){
      iris_geometries_raw = data;
    });
}

//
// function load_data_par_iris() {
//     dataiku.fetch('dataset_webapp', function(dataFrame) {
//         // on transforme le dataframe au format liste de dict
//         data_par_iris = dataFrame.mapRecords(function(record){
//             // record["the_geom"] = jQuery.parseJSON(record["the_geom"]);
//             record['flow_array'] = convert_string_to_array(record['flow_array']);
//             record['hour_array'] = convert_string_to_array(record['hour_array']);
//             record['puissance_array'] = convert_string_to_array(record['puissance_array']);
//             return record;
//         });
//     })
// }


// function load_iris_geometries(){
//     dataiku.fetch('iris_centroids', function(dataFrame) {
//         // on transforme le dataframe au format liste de dict
//         iris_geometries_raw = dataFrame.mapRecords(function(record){
//             // record["the_geom"] = jQuery.parseJSON(record["the_geom"]);
//             return record;
//         });
//     })
// };

function update_infos_and_graphics(){
    var solution_active = $('#BrightButton').prop('checked');

    // solution_active = true;
    // selected_iris = iris_geometries_raw[0];

    if(!solution_active) {
        // SOLUTION NON ACTIVEE
        create_info_view(
            84e9, // Energie totale consommee, WH
            199000, //lampadaires
            2220000, // pietons
            5600000, // voitures
            0,  // energie economisee
            1,
            "Toute la ville de Paris"  //périmètre
        );
    }
    else {
      if (selected_iris) {
          console.log(selected_iris);
          // SOLUTION ACTIVEE ET IRIS CHOISI
        iris_id = selected_iris["CODE_IRIS"]
        var saison = $('#saisonDropdown')[0].value
        if(["Ete", "Hiver"].indexOf(saison) < 0) {
            saison = "Ete"
        }
        var data = data_par_iris.find(function(element){
            return element['iris'] == iris_id & element['saison'] == saison;
        });
        r = Math.random();
        create_info_view(
            data['energie_conso_mwh'] * 1e6,
            123, //lampadaires
            12, //piétons
            32, //voitures
            data['energie_eco_mwh'] * 1e6,
            0, //pictos?,
            selected_iris['NOM_COM'] + " (" + selected_iris['NOM_IRIS'] + ")"
        )
        drawLine(data);
     }
     else {
         // CAS 2 : solution activée mais pas d'iris choisi
        create_info_view(
            601e6, // consommee WH
            1625, // lampadaires
            31000,  // pietons
            78000,  // voitures
            29.5e6, // economisee WH
            1,
            "Quartier Croulebarbe et Italie"
        );
      }
    }
}

function feature_clicked(element) {
    d3.selectAll("path").each(function(d,i) {
        // this.setAttribute("fill-opacity",0);
        this.classList.remove('selected');
    });
    var properties = this.feature.properties;
    if (properties==selected_iris){
        selected_iris=null;
    }
    else {
        this._path.classList.add('selected');
        // this.setAttribute("fill-opacity",0.5);
        // setTimeout(function(){ clickedZone.setStyle({fillOpacity: 1}); }, 100);
        // this.setStyle({fillOpacity: 1});
        selected_iris = properties;
    }
    update_infos_and_graphics();
}

function convert_iris_to_feature(iris){
    // return object L.geoJson
    var geojsonFeature = {
        "type": "Feature",
        "properties": iris,
        "geometry": jQuery.parseJSON(iris["geojson"])
    };
    var style = {
        "value": iris,
        "iris": iris,
        "color": "yellow",
        "weight": 1,
        "fillColor" : "yellow",
        "opacity": 1,
        "fillOpacity": 0
    };
    function onEachFeature(feature, layer) {
        // this function is applied on each feature
        // after they are loaded.
        layer.on({
            click: feature_clicked
        });
    }

    feature = L.geoJson(geojsonFeature, {style:style, onEachFeature: onEachFeature});
    // adding interaction
    // feature.on('click', feature_clicked);
    /*
    feature.on('mouseover', function (e) {
        this.setStyle({opacity: 1});
    });
    feature.on('mouseout', function (e) {
        this.setStyle({opacity: 0.25});
        //this.setStyle({fillOpacity: 0});

    });*/
    return feature
}

function drawIris() {
    iris_geometries_raw.forEach(function(iris){
        // ADDING iris object to the map
        var feature = convert_iris_to_feature(iris);
        feature.addTo(map);
    });
}

//Fonction pour gérer l'interrupteur Bright.
//Si ON: on zoom sur les zones iris et on les affiches.
//Si OFF: on dézoom.
$(function() {
    $("#saisonDropdown").change(update_infos_and_graphics);

    $('#BrightButton').change(function() {
        selected_iris = null;
        if ($(this).prop('checked')){
            map.flyTo([48.830, 2.35], 14.5);
            d3.select("#Bright_text").style("color","yellow");
            setTimeout(function(){ drawIris(); }, 1000);
            d3.selectAll("path").each(function(d,i) {
                this.classList.remove('selected');
            });
            update_infos_and_graphics();
        }
        else {
            map.flyTo([48.850, 2.35], 12.);
            d3.selectAll("path").each(function(d,i) {
                this.classList.remove('selected');
            });
            d3.select("#Bright_text").style("color","white");
            update_infos_and_graphics();
        }
    })
})

function numberFormat(n, energie){
    if(energie) {
        var formatted = d3.format(".2s")(n)
        return formatted.slice(0,formatted.length-1) + " " + formatted[formatted.length-1] + "Wh";
    }
    else {
        if (n>=1000000){
            var out = n/1000000.;
            return  out.toString()+ " millions";
        }
        else if (n>=1000){
            var milliers = Math.floor(n/1000.).toString();
            var centaines = Math.floor(n%1000. / 100).toString()
            return milliers + " "+ centaines + "00";
        }
        else {
            return Math.floor(n).toString();
        }
    }
}

function create_info_view(consomee,lampadaires,pietons,voitures, economies, picto, perimetre){


   var consomee = numberFormat(consomee, true);
   var lampadaires = numberFormat(lampadaires);
   var pietons = numberFormat(pietons);
   var voitures = numberFormat(voitures);

   //Reinitialisation:
   d3.select("#perimetre").html(perimetre)
   d3.select("#infos").selectAll("svg").remove();

   //Creations pictos + text:
   svg = d3.select("#infos").append("svg")
    .attr("width", 450)
    .attr("height", 600)
    .attr("id", "infoSVG");


   var xmargin = 80;
   var xspace = 120;
   var firstLine = 100;
   var secondLine = 350;
   var economieLine = 100;

   svg.append("image")
      .attr("xlink:href", "assets/encadre.svg")
      .attr("x", xmargin+xspace-80)
      .attr("y", firstLine-100)
      .attr("height", 200);

   svg.append("image")
      .attr("xlink:href", "assets/ampoule.svg")
      .attr("x", xmargin+xspace+5)
      .attr("y", firstLine-65)
      .attr("height", 50);

   svg.append("text")
      .text(consomee)
      .attr("x", xmargin+xspace-20)
      .attr("y", firstLine+20)
      .attr("font-family", "SourceSansProBold")
      .attr("font-size", 20)
      .attr("fill","yellow");

   svg.append("text")
      .text("consommés")
      .attr("x", xmargin+xspace-25)
      .attr("y", firstLine+40)
      .attr("font-family", "SourceSansProExtraLight")
      .attr("font-variant", "small-caps")
      .attr("font-size", 17)
      .attr("fill","yellow");

   if (economies>0){

   //var pourcentEco = Math.floor(((consomee-economies)/consomee)*100);
   // d3.select("#pourcentage").html(" 80% ");
   // d3.select("#selectQuartier").html("Séléctionner un quartier de Paris");

   svg.append("image")
      .attr("xlink:href", "assets/economie.svg")
      .attr("x", xmargin)
      .attr("y", firstLine+economieLine)
      .attr("height", 40);

   svg.append("text")
      .text(numberFormat(economies, true))
      .attr("x", xmargin+50)
      .attr("y", firstLine+economieLine+30)
      .attr("font-family", "SourceSansProBold")
      .attr("font-size", 20)
      .attr("fill","white");

   svg.append("text")
      .text("économisés")
      .attr("x", xmargin+130)
      .attr("y", firstLine+economieLine+30)
      .attr("font-family", "SourceSansProExtraLight")
      .attr("font-variant", "small-caps")
      .attr("font-size", 20)
      .attr("fill","white");
   }

   if (picto>0){
   svg.append("image")
      .attr("xlink:href", "assets/lampadaire.svg")
      .attr("x", xmargin)
      .attr("y", secondLine)
      .attr("height", 80);

   svg.append("text")
      .text(lampadaires)
      .attr("x", xmargin-12-lampadaires.length)
      .attr("y", secondLine+110)
      .attr("font-family", "SourceSansProBold")
      .attr("font-size", 20)
      .attr("fill","yellow");

   svg.append("text")
      .text("lampadaires")
      .attr("x", xmargin-25)
      .attr("y", secondLine+130)
      .attr("font-family", "SourceSansProExtraLight")
      .attr("font-size", 14)
      .attr("fill","white");

   svg.append("image")
      .attr("xlink:href", "assets/pieton.svg")
      .attr("x", xmargin+xspace)
      .attr("y", secondLine+30)
      .attr("height", 50);

   svg.append("text")
      .text(pietons)
      .attr("x", xmargin+xspace-2.5*pietons.length)
      .attr("y", secondLine+110)
      .attr("font-family", "SourceSansProBold")
      .attr("font-size", 20)
      .attr("fill","yellow");

   svg.append("text")
      .text("habitants")
      .attr("x", xmargin+xspace-10)
      .attr("y", secondLine+130)
      .attr("font-family", "SourceSansProExtraLight")
      .attr("font-size", 14)
      .attr("fill","white");
    /*
   svg.append("text")
      .text("circulent la nuit")
      .attr("x", xmargin+xspace-25)
      .attr("y", secondLine+150)
      .attr("font-family", "SourceSansProExtraLight")
      .attr("font-size", 14)
      .attr("fill","white");
      */

   svg.append("image")
      .attr("xlink:href", "assets/voiture.svg")
      .attr("x", xmargin+2*xspace-5)
      .attr("y", secondLine+45)
      .attr("width", 80);

   svg.append("text")
      .text(voitures)
      .attr("x", xmargin+2*xspace-0.1*voitures.length)
      .attr("y", secondLine+110)
      .attr("font-family", "SourceSansProBold")
      .attr("font-size", 20)
      .attr("fill","yellow");

   svg.append("text")
      .text("trajets de voiture")
      .attr("x", xmargin+2*xspace-5)
      .attr("y", secondLine+130)
      .attr("font-family", "SourceSansProExtraLight")
      .attr("font-size", 14)
      .attr("fill","white");

   svg.append("text")
      .text("par jour")
      .attr("x", xmargin+2*xspace+20)
      .attr("y", secondLine+150)
      .attr("font-family", "SourceSansProExtraLight")
      .attr("font-size", 14)
      .attr("fill","white");
   }
}

function convert_heure_to_float(heure_string, liste_heures) {
    // on cherche le début de l'heure creuse en 'float'
    // 0, 1, 2, 3   == 17h  18h,  19h ... (liste_heures)
    // on a "01:34:00"  et on veut le convertir en 6.51
    var heure = parseFloat(heure_string.split(":")[0]) + parseFloat(heure_string.split(":")[1]) / 60
    var index_float = -1
    for(var i=1; i<liste_heures.length; i++){
        var h0 = liste_heures[i-1];
        var h1 = liste_heures[i];
        if( (h0 < heure & h1 > heure) | (h0 == 23 & h0 < heure & heure < 24)){
            // interpolation linéaire de l'indice
            index_float = (i - 1) + (heure - h0);
            break;
        }
    }
    return index_float;
}

// dessine les courbes
function drawLine(data){
    puissances = data['puissance_array']
    heures = data['hour_array']
    flux_personnes = data['flow_array']
    debut_heure_creuse_index = convert_heure_to_float(data['start_hc'], heures)
    fin_heure_creuse_index = convert_heure_to_float(data['end_hc'], heures)
    heure_creuse_text = data['start_hc'].slice(0, 5) + " - " + data['end_hc'].slice(0, 5)


    var svg = d3.select("#infoSVG");

    // STEP 1: LAMPADAIRE
    var circle = svg.selectAll("circle")
      .data(["un_seul_cercle_pas_un_par_puissance_rhoo_matt!!"])  //.data(puissances)
      .enter()
      .append("circle");

    var scale_rayon = d3.scaleLinear().domain([0, d3.max(d3.values(puissances))]).range([20,60]);
    var scale_opacity = d3.scaleLinear() .domain([0, d3.max(d3.values(puissances))]).range([0.1,0.8]);

    circle
      .attr("cx", parseInt(svg.attr("width"))-63)
      .attr("cy", 170)
      .attr("r", scale_rayon(0))
      .attr("opacity", scale_opacity(0))
      .attr("fill", "yellow");
    var n = puissances.length;
    var tot_duration = 5000.0;  // duree de l'animation (cercle et courbe)
    var duration_une_heure = tot_duration/n;
    puissances.forEach(function(d, i) {
        circle
            .transition()
            .duration(tot_duration/(n-1))
            .delay((i-1) * (tot_duration/n))
            .attr("r", scale_rayon(d))
            .attr("opacity", scale_opacity(d));
    });

    svg.append("image")
      .attr("xlink:href", "assets/lampadaire_2.svg")
      .attr("x", parseInt(svg.attr("width"))-71)
      .attr("y", 155)
      .attr("height", 130);


    // STEP 2: Les ECHELLES
    var scale_heures = d3.scaleLinear()
        .domain([0, heures.length-1])
        .range([50, 400]);
    var scale_puissance = d3.scaleLinear()
        .domain([0, d3.max(d3.values(puissances))])
        .range([400,300]);
    var scale_flow = d3.scaleLinear()
        .domain([0, d3.max(d3.values(flux_personnes))])
        .range([550,450]);


    // STEP 2.5 : les heures creuses
    if (fin_heure_creuse_index-debut_heure_creuse_index > 1){
        var top = 280;
        var xmoy = scale_heures(debut_heure_creuse_index) + (scale_heures(fin_heure_creuse_index) - scale_heures(debut_heure_creuse_index))/2
        svg.append('text')
            .attr("fill", 'rgb(44, 112, 30)')
            .attr("x", xmoy)
            .attr('text-anchor', 'middle')
            .attr("y", top - 5)
            .text(heure_creuse_text) //  data['start_hc'])
            .attr("opacity", 0)
            .transition()
                .duration(tot_duration/2)
                .delay(tot_duration/2)
                .attr("opacity", 1);

        svg.append('rect')
            .attr('fill', 'rgb(21, 58, 13)')
            .attr("x", scale_heures(debut_heure_creuse_index))
            .attr("y", top)
            .attr("width", scale_heures(fin_heure_creuse_index) - scale_heures(debut_heure_creuse_index))
            .attr("height",scale_flow(0) - top)
            .attr("opacity", 0)
            .transition()
                .duration(tot_duration/2)
                .delay(tot_duration/2)
                .attr("opacity", 1);
    }

    // STEP 3: LES AXES
    var powerAxis = d3.axisLeft()
        .scale(scale_puissance)
        .tickFormat(function(d, i) {return d/1000})
        .ticks(2)
        // .orient("left");
    svg.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(" + scale_heures(0) + "," + 0 +")")
        .call(powerAxis);
    svg.append("text")
      // .attr("transform", "rotate(-90)")
      .attr('fill', 'yellow')
      .attr("y", scale_puissance(d3.max(d3.values(puissances))) - 5)
      .attr("x", scale_heures(0) - 10)
      .style("text-anchor", "start")
      .text("Puissance (kW)");

    var flow_axis = d3.axisLeft()
        .scale(scale_flow)
        .tickFormat(function(d, i) {
            return d3.format(".0%")(d / d3.max(d3.values(flux_personnes)))
        })
        .tickValues([0, 0.2*d3.max(d3.values(flux_personnes)), d3.max(d3.values(flux_personnes))])
        // .orient("left");
    svg.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(" + scale_heures(0) + "," + 0 +")")
        .call(flow_axis);
    svg.append("text")
      // .attr("transform", "rotate(-90)")
      .attr('fill', 'yellow')
      .attr("y", scale_flow(d3.max(d3.values(flux_personnes))) - 5)
      .attr("x", scale_heures(0) - 10)
      .style("text-anchor", "start")
      .text("Trafic relatif");

    var xAxis = d3.axisBottom()
        .scale(scale_heures)
        .tickFormat(function(d, i) {return heures[parseInt(d)] + "h"})
        // .orient("bottom");
    svg.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(0 , "+ scale_puissance(0.0) +")")
        .call(xAxis);
    svg.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(0 , "+ scale_flow(0.0) +")")
        .call(xAxis);

    // STEP 4: la ligne de puissance

    var line = d3.line()
      // .interpolate("linear")
      .x(function(d,i) {return scale_heures(i);})
      .y(function(d) {return scale_puissance(d);})

    var path = svg.append("path")
      .data([puissances])
      .attr("d", line)
      .attr("stroke", "yellow")
      .attr("stroke-width", "3")
      .attr("fill", "none");

    var totalLength = path.node().getTotalLength();

    path
      .attr("stroke-dasharray", totalLength + " " + totalLength)
      .attr("stroke-dashoffset", totalLength)
      .transition()
        .duration(tot_duration)
        .ease(d3.easeLinear)
        // .ease("linear")
        .attr("stroke-dashoffset", 0);

    // STEP 5 : histogramme des personnes
    var mybars = svg.selectAll("bar")
        .data(flux_personnes)
        .enter()
        .append("rect")

    var w = (scale_heures(1) - scale_heures(0)) / 2;
    mybars
     .style("fill", "yellow")
     .attr("x", function(d, i) {
        return scale_heures(i)- w/2;
     })
     .attr("width", w)
     .attr("y", scale_flow(0))
     .attr("height", 0)
     .transition()
        .duration(duration_une_heure)
        .delay(function(d, i) {return duration_une_heure*i;})
        .attr("y", function(d) {
            return scale_flow(d);
        })
        .attr("height",function(d) {
        // return  10
            return scale_flow(0) - scale_flow(d);
        })
}

main();

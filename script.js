const width = 960,
  height = 500,
  projection = d3.geo.albersUsa(),
  path = d3.geo.path().projection(projection);

const precincts =
    "https://raw.githubusercontent.com/JesseCHowe/Oklahoma_6_30_Election/master/precincts.json",
  counties =
    "https://raw.githubusercontent.com/JesseCHowe/Oklahoma_6_30_Election/master/counties.json",
  places =
    "https://raw.githubusercontent.com/JesseCHowe/Oklahoma_6_30_Election/master/places.json";

const colorScale = d3.scale
    .linear()
    .domain([0, 0.5, 1])
    .range(["#446093", "#874e8e", "#bc3939"]),
  option1 = "DONALD J. TRUMP | MICHAEL R. PENCE",
  option2 = "HILLARY CLINTON | TIM KAINE",
  electionData =
    "https://gist.githubusercontent.com/JesseCHowe/2342b9aff332091c57c4fd3d3c72f242/raw/bdb6e89087067f3c2d92816716126d57ef97d8ac/Oklahoma_2016_General_Election.csv";

let active = d3.select(null),
  zoomMode = false;

const againstPct = d3.select(".against-percentage"),
  againstRow = d3.select(".against-row"),
  againstVote = d3.select(".against-vote"),
  forPct = d3.select(".for-percentage"),
  forRow = d3.select(".for-row"),
  forVote = d3.select(".for-vote"),
  precinctNum = d3.select(".precinct-num"),
  tooltip = d3.select(".toolTip"),
  zoomBtn = d3.select(".zoom-btn");

const svg = d3
  .select(".map_container")
  .append("svg")
  .attr("width", width)
  .attr("height", height);
svg
  .append("rect")
  .attr("class", "background")
  .attr("width", width)
  .attr("height", height);

const g = svg.append("g").style("stroke-width", "1.5px");

queue()
  .defer(d3.json, precincts)
  .defer(d3.json, counties)
  .defer(d3.csv, electionData)
  .defer(d3.json, places)
  .await(loaded);

const countyId = d3.map();

function loaded(error, county, us, results, places) {
  let state_pre_forProp = results.filter((o) => o.cand_name === option1);
  let state_forProp = state_pre_forProp.reduce(
    (tot, num) => (tot += +num.cand_tot_votes),
    0
  );
  let state_pre_againstProp = results.filter((o) => o.cand_name === option2);
  let state_againstProp = state_pre_againstProp.reduce(
    (tot, num) => (tot += +num.cand_tot_votes),
    0
  );
  let totalresult = results.reduce((tot, num) => {
    return (tot += +num.cand_tot_votes);
  }, 0);

  let highNum = 0;
  for (let i = 0; i < results.length; i++) {
    if (+results[i].cand_tot_votes > highNum) {
      highNum = +results[i].cand_tot_votes;
    }
  }

  const opacityScale = d3.scale.linear().domain([0, 1000]).range([0, 1]);

  precinctNum.text(" ");
  againstVote.text(numberWithCommas(state_againstProp));
  forVote.text(numberWithCommas(state_forProp));
  againstPct.text(((state_againstProp / totalresult) * 100).toFixed(2) + "%");
  forPct.text(((state_forProp / totalresult) * 100).toFixed(2) + "%");
  forRow.classed("win", +state_forProp > +state_againstProp);
  againstRow.classed("win", +state_againstProp > +state_forProp);

  var test = topojson.feature(us, us.objects.tl_2019_us_county);
  projection.scale(1).translate([0, 0]);

  var b = path.bounds(test),
    s =
      0.95 /
      Math.max((b[1][0] - b[0][0]) / width, (b[1][1] - b[0][1]) / height),
    t = [
      (width - s * (b[1][0] + b[0][0])) / 2,
      (height - s * (b[1][1] + b[0][1])) / 2,
    ];

  projection.scale(s).translate(t);
  let testSort = us.objects.tl_2019_us_county.geometries.sort((a, b) => {
    if (a.properties.NAME < b.properties.NAME) {
      return -1;
    }
    if (a.properties.NAME > b.properties.NAME) {
      return 1;
    }
    return 0;
  });

  const selectionContainer = d3.select("#select-container");
  selectionContainer
    .selectAll("option")
    .data(testSort)
    .enter()
    .append("option")
    .attr("value", (d) => d.properties.NAME)
    .text((d) => d.properties.NAME);
  selectionContainer.on("change", changed);

  g.append("g")
    .attr("id", "precincts")
    .selectAll("path")
    .data(topojson.feature(county, county.objects.pct_2010).features)
    .enter()
    .append("path")
    .attr("d", path)
    .style("opacity", (d) => getOpacity(d))
    .style("fill", (d) => getColorElection(d))
    .style("stroke", (d) => getColorElection(d))
    .attr("class", (d) => `county-boundary ${d.properties.COUNTY_NAM}`);

  g.append("g")
    .attr("id", "places")
    .selectAll("path")
    .data(
      topojson.feature(places, places.objects.ne_10m_populated_places).features
    )
    .enter()
    .append("path")
    .attr(
      "class",
      (d) => "place-point " + d.properties.NAME.split(" ").join("_")
    )
    .style("fill", "#fff")
    .style("stroke", "#333")
    .attr("d", path);

  g.append("g")
    .attr("id", "places_name")
    .selectAll("path")
    .data(
      topojson.feature(places, places.objects.ne_10m_populated_places).features
    )
    .enter()
    .append("text")
    .attr(
      "class",
      (d) => "place-text " + d.properties.NAME.split(" ").join("_")
    )
    .attr("transform", function (d) {
      return "translate(" + projection(d.geometry.coordinates) + ")";
    })
    .attr("dy", "-0.60em")
    .attr("dx", ".35em")
    .attr("font-size", 15)
    .text((d) => d.properties.NAME);
  d3.select("#places_name .Oklahoma_City").attr("dx", "-7.35em");
  d3.select("#places_name .Norman").attr("dx", "-4.35em").attr("dy", "0.80em");

  d3.selectAll(".Bartlesville").remove();

  g.append("g")
    .attr("id", "counties")
    .selectAll("path")
    .data(topojson.feature(us, us.objects.tl_2019_us_county).features)
    .enter()
    .append("path")
    .attr("d", path)
    .attr(
      "class",
      (d) =>
        `feature feature-${d.properties.NAME.toUpperCase()
          .split(" ")
          .join("_")}`
    )
    .on("mousemove", (d) => mouseOverFunc(d))
    .on("mouseout", (d) => mouseOutFunc(d))
    .on("click", clicked);

  zoomBtn.on("click", reset);

  function clicked(d) {
    svg.selectAll(".feature").on("click", null);
    d3.selectAll(".place-text").style("display", "none");
    d3.selectAll(".place-point").style("display", "none");

    svg.selectAll(".county-boundary").style("opacity", 0.15);
    let selCounty;
    if (d.properties.NAME === "Roger Mills") {
      selCounty = d.properties.NAME.toUpperCase().split(" ").join("_");
    } else if (d.properties.NAME === "Le Flore") {
      selCounty = d.properties.NAME.toUpperCase().split(" ").join("");
    } else {
      selCounty = d.properties.NAME.toUpperCase();
    }
    d3.selectAll(".featurebg").style("display", "none");
    d3.selectAll(`.${selCounty}`).style("opacity", (d) => getOpacity(d));
    zoomBtn.style("display", "block");

    zoomMode = true;
    if (active.node() === this) return reset();
    active.classed("active", false);
    active = d3.select(this).classed("active", true);

    var bounds = path.bounds(d),
      dx = bounds[1][0] - bounds[0][0],
      dy = bounds[1][1] - bounds[0][1],
      x = (bounds[0][0] + bounds[1][0]) / 2,
      y = (bounds[0][1] + bounds[1][1]) / 2,
      scale = 0.9 / Math.max(dx / width, dy / height),
      translate = [width / 2 - scale * x, height / 2 - scale * y];

    g.transition()
      .duration(750)
      .style("stroke-width", 1.5 / scale + "px")
      .attr("transform", "translate(" + translate + ")scale(" + scale + ")");

    svg
      .selectAll(`#precincts .${selCounty}`)
      .style("stroke", (d) => getColorElection(d))
      .style("stroke-width", 0);

    g.append("g")
      .attr("class", "precinct_tip")
      .selectAll("path")
      .data(
        topojson
          .feature(county, county.objects.pct_2010)
          .features.filter((o) => o.properties.COUNTY_NAM === selCounty)
      )
      .enter()
      .append("path")
      .attr("d", path)
      .style("fill", "rgba(0,0,0,0)")
      .attr("class", (d) => `county-boundary2 ${d.properties.COUNTY_NAM}`)
      .on("mousemove", (d) => county_mouseOverFunc(d));
  }

  function changed(d) {
    var selectedOption = d3.select(this).property("value");
    if (selectedOption === "all") reset();
    svg.selectAll(".feature").on("click", null);
    d3.selectAll(".place-text").style("display", "none");
    d3.selectAll(".place-point").style("display", "none");

    zoomBtn.style("display", "block");
    d3.selectAll(".featurebg").style("display", "none");

    zoomMode = true;
    let precinctSel;
    if (selectedOption === "Roger Mills") {
      precinctSel = "ROGER_MILLS";
    } else if (selectedOption === "Le Flore") {
      precinctSel = "LEFLORE";
    } else {
      precinctSel = selectedOption.toUpperCase();
    }

    d3.selectAll(`#precincts .${precinctSel}`)
      .style("stroke", "#fff")
      .style("stroke-width", 0);

    svg.selectAll(".feature").on("click", null);
    svg.selectAll(".county-boundary").style("opacity", 0.5);

    d3.selectAll(`.${precinctSel}`).style("opacity", (d) => getOpacity(d));
    let testing = d3.select(`g .${precinctSel}`).node();
    if (active.node() === testing) return reset();
    active.classed("active", false);
    active = d3.select(testing).classed("active", true);

    const testB = topojson
      .feature(us, us.objects.tl_2019_us_county)
      .features.filter((o) => o.properties.NAME === selectedOption)[0];

    var bounds = path.bounds(testB),
      dx = bounds[1][0] - bounds[0][0],
      dy = bounds[1][1] - bounds[0][1],
      x = (bounds[0][0] + bounds[1][0]) / 2,
      y = (bounds[0][1] + bounds[1][1]) / 2,
      scale = 0.9 / Math.max(dx / width, dy / height),
      translate = [width / 2 - scale * x, height / 2 - scale * y];

    g.transition()
      .duration(750)
      .style("stroke-width", 1.5 / scale + "px")
      .attr("transform", "translate(" + translate + ")scale(" + scale + ")");

    let selCounty;
    if (testB.properties.NAME === "Roger Mills") {
      selCounty = testB.properties.NAME.toUpperCase().split(" ").join("_");
    } else if (testB.properties.NAME === "Le Flore") {
      selCounty = testB.properties.NAME.toUpperCase().split(" ").join("");
    } else {
      selCounty = testB.properties.NAME.toUpperCase();
    }
    g.append("g")
      .attr("class", "precinct_tip")
      .selectAll("path")
      .data(
        topojson
          .feature(county, county.objects.pct_2010)
          .features.filter((o) => o.properties.COUNTY_NAM === selCounty)
      )
      .enter()
      .append("path")
      .attr("d", path)
      .style("fill", "")
      .style("fill-opacity", 0)
      .attr("class", (d) => `county-boundary2 ${d.properties.COUNTY_NAM}`)
      .on("mousemove", (d) => county_mouseOverFunc(d));
  }

  function getColorElection(d) {
    const selectedPrecinct = results.filter(
        (o) => +o.precinct_code === +d.properties.PCT_CEB
      ),
      totalresult = selectedPrecinct.reduce(
        (tot, num) => (tot += +num.cand_tot_votes),
        0
      ),
      republianCount =
        selectedPrecinct.filter((o) => o.cand_name === option1)[0] || 0,
      pctLiberal = +republianCount.cand_tot_votes / totalresult;
    return colorScale(pctLiberal);
  }

  function getOpacity(d) {
    const precinct = results.filter(
        (o) => +o.precinct_code === +d.properties.PCT_CEB
      ),
      totalresult = precinct.reduce((tot, num) => {
        return (tot += +num.cand_tot_votes);
      }, 0),
      voteCount = +totalresult || 0;
    return opacityScale(voteCount);
  }

  function mouseOverFunc(d) {
    precinctNum.text(null);
    if (!zoomMode) {
      selectionContainer
        .selectAll("option")
        .property("selected", (o) => o.properties.NAME === d.properties.NAME);
      let selCounty;
      if (d.properties.NAME === "Le Flore") {
        selCounty = results.filter(
          (o) =>
            o.county_name ===
            d.properties.NAME.toUpperCase().split(" ").join("")
        );
      } else if (d.properties.NAME === "Roger Mills") {
        selCounty = results.filter(
          (o) =>
            o.county_name.split(" ").join("_") ===
            d.properties.NAME.toUpperCase().split(" ").join("_")
        );
      } else {
        selCounty = results.filter(
          (o) => o.county_name === d.properties.NAME.toUpperCase()
        );
      }
      const filterCounty = d.properties.NAME.toUpperCase().split(" ").join("_");
      d3.select(`.feature-${filterCounty}`).style("stroke", "rgba(0,0,0,1)");
      const totalresult = selCounty.reduce(
          (tot, num) => (tot += +num.cand_tot_votes),
          0
        ),
        pre_forProp = selCounty.filter((o) => o.cand_name === option1),
        forProp = pre_forProp.reduce(
          (tot, num) => (tot += +num.cand_tot_votes),
          0
        ),
        pre_againstProp = selCounty.filter((o) => o.cand_name === option2),
        againstProp = pre_againstProp.reduce(
          (tot, num) => (tot += +num.cand_tot_votes),
          0
        );
      againstVote.text(numberWithCommas(againstProp));
      forVote.text(numberWithCommas(forProp));
      againstPct.text(((againstProp / totalresult) * 100).toFixed(2) + "%");
      forPct.text(((forProp / totalresult) * 100).toFixed(2) + "%");
      forRow.classed("win", +forProp > +againstProp);
      againstRow.classed("win", +againstProp > +forProp);
    }
  }

  function mouseOutFunc(d) {
    if (!zoomMode) {
      d3.select("#select-container").property("value", "all");
      d3.selectAll(`.feature`).style("stroke", "rgba(0,0,0,0)");
      againstVote.text(numberWithCommas(state_againstProp));
      forVote.text(numberWithCommas(state_forProp));
      againstPct.text(
        ((state_againstProp / totalresult) * 100).toFixed(2) + "%"
      );
      forPct.text(((state_forProp / totalresult) * 100).toFixed(2) + "%");
      forRow.classed("win", +state_forProp > +state_againstProp);
      againstRow.classed("win", +state_againstProp > +state_forProp);
    }
  }

  function county_mouseOverFunc(d) {
    if (zoomMode) {
      const test = results.filter(
        (o) => +o.precinct_code === +d.properties.PCT_CEB
      );
      let totalresult = test.reduce(
        (tot, num) => (tot += +num.cand_tot_votes),
        0
      );
      const forProp = test.filter((o) => o.cand_name == option1)[0] || 0;
      const againstProp = test.filter((o) => o.cand_name == option2)[0] || 0;
      precinctNum.text(`Precinct ${+d.properties.Precinct}`);
      againstVote.text(numberWithCommas(againstProp.cand_tot_votes));
      forVote.text(numberWithCommas(forProp.cand_tot_votes));
      againstPct.text(
        ((againstProp.cand_tot_votes / totalresult) * 100).toFixed(2) + "%"
      );
      forPct.text(
        ((forProp.cand_tot_votes / totalresult) * 100).toFixed(2) + "%"
      );

      forRow.classed(
        "win",
        +forProp.cand_tot_votes > +againstProp.cand_tot_votes
      );
      againstRow.classed(
        "win",
        +againstProp.cand_tot_votes > +forProp.cand_tot_votes
      );
    }
  }

  function reset() {
    d3.select("#select-container").property("value", "all");
    d3.selectAll(".county-boundary").style("stroke", (d) =>
      getColorElection(d)
    );
    svg.selectAll(".county-boundary").style("opacity", (d) => getOpacity(d));
    d3.selectAll(".featurebg").style("display", "block");
    d3.selectAll(".place-text").style("display", "block");
    d3.selectAll(".place-point").style("display", "block");
    svg.selectAll(".precinct_tip").remove();
    svg.selectAll(".feature").on("click", clicked);
    zoomMode = false;
    zoomBtn.style("display", "none");
    active.classed("active", false);
    active = d3.select(null);
    g.transition()
      .duration(750)
      .style("stroke-width", "1.5px")
      .attr("transform", "");
  }
}

function numberWithCommas(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

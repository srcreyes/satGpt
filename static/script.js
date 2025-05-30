/**
 * @fileoverview Runs the Surface Water Tool application. The code is executed in the
 * user's browser. It communicates with the App Engine backend, renders output
 * to the screen, and handles user interactions.
 */

// Set the namespace
water = {};
var flood_hotspot_year_from = 2000
var flood_hotspot_year_count = 5
// Starts the Surface Water Tool application. The main entry point for the app.
water.boot = function() {

	// create the app
	var app = new water.App();

	// save app to instance
	water.instance = app;
};

// ---------------------------------------------------------------------------------- //
// The application
// ---------------------------------------------------------------------------------- //

// The main Surface Water Tool application with default settings
water.App = function() {
  // create and display the map
  this.map = water.App.createMap();

  // drawing manager
  this.drawingManager = water.App.createDrawingManager(this.map);

  // The currently active layer
  //(used to prevent reloading when requested layer is the same)
  this.currentLayer = {};
	this.aoiParams = {};
	this.handParams = {};
	this.waterParams = {};
	this.floodParams = {};
	this.lcluParams = {};
	this.populationDensityParams = {};
	this.soilTextureParams = {};
	this.healthCareAccessParams = {};
	this.hotspotsParams = {};
	this.countries = {};

  this.opacitySliders();
//   this.climatologySlider();
// 	this.loadSearchBox();
	this.loadZoomInOut();

	// set default parameters
	this.setDefaultParams();
  //this.refreshImage();  // calculate new layer based on initial params
	this.loadDefault();  // use pre-calculated layer
};

/**
 * Creates a Google Map for the given map type rendered.
 * The map is anchored to the DOM element with the CSS class 'map'.
 * @return {google.maps.Map} A map instance with the map type rendered.
 */
water.App.createMap = function() {
  var mapOptions = {
	container: 'map',
	style: 'mapbox://styles/unuinweh/clsmw8jm201f201ql5wdgcifp',
	zoom: water.App.DEFAULT_ZOOM,
	center: water.App.DEFAULT_CENTER
  }
  var map = new mapboxgl.Map(mapOptions);
  return map;
};

// Load default water map upon loading the main web page
water.App.prototype.loadDefault = function() {
  $.ajax({
    url: "/get_default",
    dataType: "json",
    success: function (data) {
			water.instance.waterParams = {'mapId': data.eeMapId, 'token': data.eeToken, 'tile_url': data.eeMapURL};
			// water.instance.setWaterMap(data.eeMapURL, 'water', water.App.Z_INDEX_WATER);
			$('.enable-disable').prop('disabled', true);
			$('.en-ds').slider('disable');
    },
    error: function (data) {
      console.log(data.responseText);
    }
  });

}
 

// SHOW GRID LAYER ON THE MAP
water.App.prototype.showGrid = function (){

	water.instance.map.addSource('grid_cell', {
		type: 'geojson',
		// Use a URL for the value for the `data` property.
		data: '/static/HFMT_Fishnet_3_FeaturesToJSO.geojson',
	});

	water.instance.map.addLayer({
		'id': 'grid_cell-layer',
		'type': 'fill',
		'source': 'grid_cell',
		'paint': {
			'fill-color': 'transparent',
			'fill-opacity': 1,
			'fill-outline-color': 'black'
		}
	});
}

// SHOW POLYGON ON THE SELECTED GRID
water.App.prototype.drawPolygon = function(cords){	
	try {
		if (this.map.getLayer("LineString")){
			this.map.removeLayer('LineString');
		}
		this.map.removeSource('LineString');
	}
	catch (e) {
			// pass
		}

	let geojson = {
		'type': 'FeatureCollection',
		'features': [
		{
			'type': 'Feature',
			'geometry': {
				'type': 'LineString',
				'properties': {},
				'coordinates': cords
			}
		}
		]
	};

	this.map.addSource('LineString', {
		'type': 'geojson',
		'data': geojson
	});
	this.map.addLayer({
		'id': 'LineString',
		'type': 'line',
		'source': 'LineString',
		'layout': {
			'line-join': 'round',
			'line-cap': 'round'
		},
		'paint': {
			'line-color': '#FFFFFF',
			'line-width': 5
		}
	});
	this.refreshImage(); 
}

// SELECT A GRID (IT RETURNS SELECTED GRID CORDINATES)
water.App.prototype.selectedGrid = function(){
	water.instance.map.on('click', 'grid_cell-layer', (e) => {

		var features = water.instance.map.queryRenderedFeatures(e.point);
		water.instance.selected_grid_cords = features[0].geometry.coordinates[0];
		water.instance.drawPolygon(features[0].geometry.coordinates[0]);

		$('.enable-disable').prop('disabled', false);
		$('.en-ds').slider('enable');

		let bounds = water.instance.selected_grid_cords;
		water.instance.map.fitBounds(
			[
				[bounds[0][0], bounds[0][1]],
				[bounds[2][0], bounds[2][1]]
			],
			{padding: 150}
		);
	});
	
	return water.instance.selected_grid_cords;
}

// ZOOM TO COUNTRY WHEN USER SEARCH A COUNTRY
water.App.prototype.zoomToCountry = function (countryCode) {
	$('.enable-disable').prop('disabled', true);
	$('.en-ds').slider('disable');
	let country = water.instance.countries[countryCode];
	let bounds = country[1]
	water.instance.map.fitBounds(
		[
			[bounds[0], bounds[1]],
			[bounds[2], bounds[3]]
		]
	);

	water.instance.map.off('click');
	
	water.instance.showGrid();
	water.instance.selectedGrid();
}

// Initializes the date pickers.
water.App.prototype.initDatePickers = function() {

  // Create the date pickers.
  $('.date-picker').datepicker({
    format: 'yyyy-mm-dd',
    viewMode: 'days',
    minViewMode: 'days',
    autoclose: true,
    startDate: new Date('1988-01-01'),
    endDate: new Date()
  });
  $('.date-picker-2').datepicker({
    format: 'yyyy-mm-dd',
    viewMode: 'days',
    minViewMode: 'days',
    autoclose: true,
    startDate: new Date('1988-01-01'),
    endDate: new Date()
  });

};


/**
 * Returns the currently selected time period as a parameter.
 * @return {Object} The current time period in a dictionary.
 */
water.App.prototype.getTimeParams = function() {

  return {time_start: $('.date-picker').val(), time_end: $('.date-picker-2').val()};
};

// ---------------------------------------------------------------------------------- //
// Expert controls input
// ---------------------------------------------------------------------------------- //

water.App.prototype.getExpertParams = function() {
  return {
    climatology: false,
		month_index: 1,
		defringe: false,
		pcnt_perm: 40,
		pcnt_temp: 8,
		water_thresh: 0.3,
		veg_thresh: 0.3,
		hand_thresh: 50,
		cloud_thresh: -1
  };
};

water.App.prototype.climatologySlider = function() {
  $("#monthsControl").on("slideStop", this.updateSlider.bind(this));
}

// ---------------------------------------------------------------------------------- //
// Layer management
// ---------------------------------------------------------------------------------- //

// Get all relevant info for new layer
water.App.prototype.getAllParams = function() {
  var timeParams   = this.getTimeParams();
  var expertParams = this.getExpertParams();
  return $.extend(timeParams, expertParams);
};

water.App.prototype.setParams = function(params) {
	// set input parameters
	$('.date-picker').val(params['time_start']);
	$('.date-picker-2').val(params['time_end']);
	$(".climatology-input").attr('checked', Boolean(params['climatology']));
	$("#monthsControl").val(params['month_index']);
	$(".defringe-input").attr('checked', Boolean(params['defringe']));
	$('.percentile-input-perm').val(params['pcnt_perm']);
	$('.percentile-input-temp').val(params['pcnt_temp']);
	$('.water-threshold-input').val(params['water_thresh']);
	$('.veg-threshold-input').val(params['veg_thresh']);
	$('.hand-threshold-input').val(params['hand_thresh']);
	$('.cloud-threshold-input').val(params['cloud_thresh']);
}

water.App.prototype.setDefaultParams = function() {
	this.setParams(water.App.DEFAULT_PARAMS);
}

water.App.prototype.updateSlider = function() {
	if (water.App.EXAMPLE_MONTHS_ACTIVE) {
		// get slider value
		var month = parseInt($("#monthsControl").val());
		// get mapid and token (calculated when specific example is opened)
		var month_data = water.instance.exampleParams[month];
		// update map using pre-calculated example
		water.instance.waterParams = {'mapId': month_data.eeMapId, 'token': month_data.eeToken, 'tile_url': month_data.eeMapURL};
		water.instance.setWaterMap(month_data.eeMapURL, 'water', water.App.Z_INDEX_WATER);
	} else {
		// update map with new calculation
		this.refreshImage();
	}

}
window.onload = function(){
	document.getElementById('MsgModal').style.display = 'block';
	setLayersTransparencyOptions();
	resetTransparency();
	$('#yearControl').slider('disable');
	document.getElementById('suggestionsBoxFloodHotspot').hidden = true;
	$("#historicalDataCheckbox").prop("checked", true);
	$("#floodHotspotCheckbox").prop("checked", false);
};

function floodAndWaterLayersChecked(){
	$("#floodLayerCheckbox").prop("checked", true);
	$("#waterLayerCheckbox").prop("checked", true);
	$("#lcluLayerCheckbox").prop("checked", false);
	$("#populationDensityLayerCheckbox").prop("checked", false);
	$("#soilTextureLayerCheckbox").prop("checked", false);
	$("#healthCareAccessLayerCheckbox").prop("checked", false);
	changeLayerDropdownOptions();
}

function refreshMap(){
	document.querySelector('.result-box').style.display = 'none';
	document.querySelector('.chat-box').style.display = 'block';
}

function displayPromptAfterGridCell(){
	if (water.instance.map.getLayer("grid_cell-layer")){
		$('#promptModal').css('display', 'block');
	}
}

function setLayersTransparencyOptions(){
	$("#layerDropdown").trigger("change");

	// Event handler for transparency control change
	$("#transparencyControl").on("change", function() {
		// Get the selected layer from the dropdown
		let selectedLayer = $("#layerDropdown").val();
		// Set transparency for the selected layer
		if (water.instance.map.getLayer(selectedLayer + "-layer")) {
			water.instance.setLayerOpacity(selectedLayer, parseFloat($(this).val()));
		}
		// Store the transparency value in localStorage
		localStorage.setItem(selectedLayer + "_transparency", $(this).val());
	});

	// Event handler for layer dropdown change
	$("#layerDropdown").on("change", function() {
		// Get the selected layer
		let selectedLayer = $(this).val();
		// Get the transparency value from localStorage
		let transparencyValue = localStorage.getItem(selectedLayer + "_transparency") || 1; // Default to 1 if not found
		// Set transparency for the selected layer
		if (water.instance.map.getLayer(selectedLayer + "-layer")) {
			water.instance.setLayerOpacity(selectedLayer, parseFloat(transparencyValue));
		}
		// Update transparency control value
		$("#transparencyControl").slider("setValue", parseFloat(transparencyValue));
	});
}

function resetTransparency(){
	if ($("#waterLayerCheckbox").is(":checked")){
		if (water.instance.map.getLayer("water-layer")){
			water.instance.setLayerOpacity('water', 1);
		}
	}
	if ($("#floodLayerCheckbox").is(":checked")){
		if (water.instance.map.getLayer("flood-layer")){
			water.instance.setLayerOpacity('flood', 1);
		}
	}	
	if ($("#lcluLayerCheckbox").is(":checked")){
		if (water.instance.map.getLayer("lclu-layer")){
			water.instance.setLayerOpacity('lclu', 1);
		}
	}
	if ($("#populationDensityLayerCheckbox").is(":checked")){
		if (water.instance.map.getLayer("populationDensity-layer")){
			water.instance.setLayerOpacity('populationDensity', 1);
		}
	}
	if ($("#soilTextureLayerCheckbox").is(":checked")){
		if (water.instance.map.getLayer("soilTexture-layer")){
			water.instance.setLayerOpacity('soilTexture', 1);
		}
	}
	if ($("#healthCareAccessLayerCheckbox").is(":checked")){
		if (water.instance.map.getLayer("healthCareAccess-layer")){
			water.instance.setLayerOpacity('healthCareAccess', 1);
		}
	}
	localStorage.removeItem('water_transparency');
	localStorage.removeItem('flood_transparency');
	localStorage.removeItem('lclu_transparency');
	localStorage.removeItem('populationDensity_transparency');
	localStorage.removeItem('soilTexture_transparency');
	localStorage.removeItem('healthCareAccess_transparency');
	$("#transparencyControl").slider("setValue", 1);
}



function removePreviousLayers(){
	if (water.instance.map.getLayer("water-layer")) {
		water.instance.map.removeLayer('water-layer');
	}
	if (water.instance.map.getLayer("flood-layer")) {
		water.instance.map.removeLayer('flood-layer');
	}
	if (water.instance.map.getLayer("lclu-layer")) {
		water.instance.map.removeLayer('lclu-layer');
	}
	if (water.instance.map.getLayer("populationDensity-layer")) {
		water.instance.map.removeLayer('populationDensity-layer');
	}
	if (water.instance.map.getLayer("soilTexture-layer")) {
		water.instance.map.removeLayer('soilTexture-layer');
	}
	if (water.instance.map.getLayer("healthCareAccess-layer")) {
		water.instance.map.removeLayer('healthCareAccess-layer');
	}
	if (water.instance.map.getLayer("hand-layer")) {
		water.instance.map.removeLayer('hand-layer');
	}
	if (water.instance.map.getLayer("AoI-layer")) {
		water.instance.map.removeLayer('AoI-layer');
	}
	if (water.instance.map.getSource("water")){
		water.instance.map.removeSource('water');
	}
	if (water.instance.map.getSource("flood")){
		water.instance.map.removeSource('flood');
	}
	if (water.instance.map.getSource("lclu")){
		water.instance.map.removeSource('lclu');
	}
	if (water.instance.map.getSource("populationDensity")){
		water.instance.map.removeSource('populationDensity');
	}
	if (water.instance.map.getSource("soilTexture")){
		water.instance.map.removeSource('soilTexture');
	}
	if (water.instance.map.getSource("healthCareAccess")){
		water.instance.map.removeSource('healthCareAccess');
	}
	if (water.instance.map.getLayer("LineString")){
		water.instance.map.removeLayer('LineString');
	}
	if (water.instance.map.getSource("LineString")){
		water.instance.map.removeSource('LineString');
	}
}

function removeGridCellLayer(){
	if (water.instance.map.getLayer("grid_cell-layer")) {
		water.instance.map.removeLayer('grid_cell-layer');
	}
	if (water.instance.map.getSource("grid_cell")) {
		water.instance.map.removeSource('grid_cell');
	}
	removeGrid();
}

function updateLayerOnMap(){
	if ($("#floodLayerCheckbox").is(":checked")){
		if (water.instance.map.getLayer("flood-layer")){
			water.instance.setLayerOpacity('flood', parseFloat(localStorage.getItem('flood_transparency')) || 1);
		}
	}
	else{
		if (water.instance.map.getLayer("flood-layer")){
			water.instance.setLayerOpacity('flood', 0);
		}
	}

	if ($("#waterLayerCheckbox").is(":checked")){
		if (water.instance.map.getLayer("water-layer")){
			water.instance.setLayerOpacity('water', parseFloat(localStorage.getItem('water_transparency')) || 1);
		}
	}
	else{
		if (water.instance.map.getLayer("water-layer")){
			water.instance.setLayerOpacity('water', 0);
		}
	}

	if ($("#lcluLayerCheckbox").is(":checked")){
		if (water.instance.map.getLayer("lclu-layer")){
			water.instance.setLayerOpacity('lclu', parseFloat(localStorage.getItem('lclu_transparency')) || 1);
		}
	}
	else{
		if (water.instance.map.getLayer("lclu-layer")){
			water.instance.setLayerOpacity('lclu', 0);
		}
	}

	if ($("#populationDensityLayerCheckbox").is(":checked")){
		if (water.instance.map.getLayer("populationDensity-layer")){
			water.instance.setLayerOpacity('populationDensity', parseFloat(localStorage.getItem('populationDensity_transparency')) || 1);
		}
	}
	else{
		if (water.instance.map.getLayer("populationDensity-layer")){
			water.instance.setLayerOpacity('populationDensity', 0);
		}
	}

	if ($("#soilTextureLayerCheckbox").is(":checked")){
		if (water.instance.map.getLayer("soilTexture-layer")){
			water.instance.setLayerOpacity('soilTexture', parseFloat(localStorage.getItem('soilTexture_transparency')) || 1);
		}
	}
	else{
		if (water.instance.map.getLayer("soilTexture-layer")){
			water.instance.setLayerOpacity('soilTexture', 0);
		}
	}

	if ($("#healthCareAccessLayerCheckbox").is(":checked")){
		if (water.instance.map.getLayer("healthCareAccess-layer")){
			water.instance.setLayerOpacity('healthCareAccess', parseFloat(localStorage.getItem('healthCareAccess_transparency')) || 1);
		}
	}
	else{
		if (water.instance.map.getLayer("healthCareAccess-layer")){
			water.instance.setLayerOpacity('healthCareAccess', 0);
		}
	}
	
}

function toggleLCLULegend(){
	var lclu = document.getElementById('lcluLayerCheckbox');
	if (lclu.checked){
		document.getElementById('lcluPanel').style.display = 'block';
	}
	else{
		document.getElementById('lcluPanel').style.display = 'none';
	}
}

function toggleSoilTextureLegend(){
	var soilTexture = document.getElementById('soilTextureLayerCheckbox');
	if (soilTexture.checked){
		document.getElementById('soilTexturePanel').style.display = 'block';
	}
	else{
		document.getElementById('soilTexturePanel').style.display = 'none';
	}
	toggleDivHealthSoilPopulation();
}

function toggleHealthCareAccessLegend(){
	var healthCareAccess = document.getElementById('healthCareAccessLayerCheckbox');
	if (healthCareAccess.checked){
		document.getElementById('healthCareAccessContainer').style.display = 'block';
	}
	else{
		document.getElementById('healthCareAccessContainer').style.display = 'none';
	}
	toggleDivHealthSoilPopulation();
}

function togglePopulationDensityLegend(){
	var populationDensity = document.getElementById('populationDensityLayerCheckbox');
	if (populationDensity.checked){
		document.getElementById('populationDensityContainer').style.display = 'block';
	}
	else{
		document.getElementById('populationDensityContainer').style.display = 'none';
	}
	toggleDivHealthSoilPopulation();
	
}
function toggleDivHealthSoilPopulation(){
	var populationDensity = document.getElementById('populationDensityLayerCheckbox');
	var healthCareAccess = document.getElementById('healthCareAccessLayerCheckbox');
	var soilTexture =  document.getElementById('soilTextureLayerCheckbox');
	var populationHealthSoil = document.getElementById('populationHealthSoilContainer');
	if (populationDensity.checked || healthCareAccess.checked || soilTexture.checked){
		populationHealthSoil.style.display = 'block';
	}
	else{
		populationHealthSoil.style.display = 'none';
	}
}

// Updates the image based on the current control panel config.
water.App.prototype.refreshImage = function () {
	// obtain params
	var params = this.getAllParams();
	params['AoI_cords'] = JSON.stringify(water.instance.selected_grid_cords)
	params['time_start'] = water.instance.gptResponse.start_date
	params['time_end'] = water.instance.gptResponse.end_date
	if (params['time_start'] > params['time_end']) {
		$('.warnings span').text('Warning! Start date should be less than end date!')
		$('.warnings').show();
		return;
	}

	else {

		// $(".spinner").show();
		$("#spinner-overlay")[0].style.display = "inline-flex";
		//remove warnings
		$('.warnings span').text('')
		$('.warnings').hide();
		
		// remove map layer(s)
		if (this.map.getLayer("water-layer")) {
			this.removeLayer('water');
		}
		if (this.map.getLayer("flood-layer")) {
			this.removeLayer('flood');
		}
		if (this.map.getLayer("lclu-layer")) {
			this.removeLayer('lclu');
		}
		if (this.map.getLayer("populationDensity-layer")) {
			this.removeLayer('populationDensity');
		}
		if (this.map.getLayer("soilTexture-layer")) {
			this.removeLayer('soilTexture');
		}
		if (this.map.getLayer("healthCareAccess-layer")) {
			this.removeLayer('healthCareAccess');
		}
		if (this.map.getLayer("hand-layer")) {
			this.removeLayer('hand');
		}
		if (this.map.getLayer("AoI-layer")) {
			this.removeLayer('AoI');
		}

		// add climatology slider if required
		if (params['climatology'] == true) {
			$(".months-slider").show();
		} else {
			$(".months-slider").hide();
		};

		var historicalDataChecked = $("#historicalDataCheckbox").is(":checked");
		var unsupervisedClassificationChecked = $("#unsupervisedClassificationCheckbox").is(":checked");
		var floodHotspotChecked = $("#floodHotspotCheckbox").is(":checked");

		// Determine the value of collection_string based on checkbox status
		var areaDataType = ''
		if (historicalDataChecked) {
			urlString = "/get_historical_map";
			areaDataType = 'historical'
		} else if (unsupervisedClassificationChecked) {
			urlString = "/get_unsupervised_map";
			areaDataType = 'unsupervised'
		}
		else {
			urlString = "/get_flood_hotspot_map"
			areaDataType = 'flood_hotspot'
			params['year_from'] = flood_hotspot_year_from;
			params['year_count'] = $("#yearControl").val();
		}
		$.ajax({
			url: urlString,
			data: params,
			dataType: "json",
			success: function (data) {
				removePreviousLayers();

				if (urlString == "/get_flood_hotspot_map"){
					
					water.instance.floodParams = { 'mapId': data.eeMapIdFlood, 'token': data.eeTokenFlood, 'tile_url': data.eeMapURLFlood };
					water.instance.setFloodMap(data.eeMapURLFlood, 'flood', water.App.Z_INDEX_WATER);
					if($("#floodLayerCheckbox").is(":checked")){
						water.instance.setLayerOpacity('flood', parseFloat(localStorage.getItem('flood_transparency')) || 1);
					}
					else{
						water.instance.setLayerOpacity('flood', 0);
					}
					water.instance.waterParams = { 'mapId': data.eeMapIdWater, 'token': data.eeTokenWater, 'tile_url': data.eeMapURLWater };
					water.instance.setWaterMap(data.eeMapURLWater, 'water', water.App.Z_INDEX_WATER);
					if($("#waterLayerCheckbox").is(":checked")){
						water.instance.setLayerOpacity('water', parseFloat(localStorage.getItem('water_transparency')) || 1);
					}
					else{
						water.instance.setLayerOpacity('water', 0);
					}
					water.instance.lcluParams = { 'mapId': data.eeMapIdLCLU, 'token': data.eeTokenLCLU, 'tile_url': data.eeMapURLLCLU };
					water.instance.setLCLUMap(data.eeMapURLLCLU, 'lclu', water.App.Z_INDEX_WATER);
					if($("#lcluLayerCheckbox").is(":checked")){
						water.instance.setLayerOpacity('lclu', parseFloat(localStorage.getItem('lclu_transparency')) || 1);
					}
					else{
						water.instance.setLayerOpacity('lclu',0);
					}
					water.instance.populationDensityParams = { 'mapId': data.eeMapIdPopulationDensity, 'token': data.eeTokenPopulationDensity, 'tile_url': data.eeMapURLPopulationDensity };
					water.instance.setPopulationDensityMap(data.eeMapURLPopulationDensity, 'populationDensity', water.App.Z_INDEX_WATER);
					if($("#populationDensityLayerCheckbox").is(":checked")){
						water.instance.setLayerOpacity('populationDensity', parseFloat(localStorage.getItem('populationDensity_transparency')) || 1);
					}
					else{
						water.instance.setLayerOpacity('populationDensity', 0);
					}
					water.instance.soilTextureParams = { 'mapId': data.eeMapIdSoilTexture, 'token': data.eeTokenSoilTexture, 'tile_url': data.eeMapURLSoilTexture };
					water.instance.setSoilTextureMap(data.eeMapURLSoilTexture, 'soilTexture', water.App.Z_INDEX_WATER);
					if($("#soilTextureLayerCheckbox").is(":checked")){
						water.instance.setLayerOpacity('soilTexture', parseFloat(localStorage.getItem('soilTexture_transparency')) || 1);
					}
					else{
						water.instance.setLayerOpacity('soilTexture', 0);
					}
					water.instance.healthCareAccessParams = { 'mapId': data.eeMapIdHealthCareAccess, 'token': data.eeTokenHealthCareAccess, 'tile_url': data.eeMapURLHealthCareAccess };
					water.instance.setHealthCareAccessMap(data.eeMapURLHealthCareAccess, 'healthCareAccess', water.App.Z_INDEX_WATER);
					if($("#healthCareAccessLayerCheckbox").is(":checked")){
						water.instance.setLayerOpacity('healthCareAccess', parseFloat(localStorage.getItem('healthCareAccess_transparency')) || 1);
					}
					else{
						water.instance.setLayerOpacity('healthCareAccess', 0);
					}
				}
				else{
					water.instance.floodParams = { 'mapId': data.eeMapIdFlood, 'token': data.eeTokenFlood, 'tile_url': data.eeMapURLFlood };
					water.instance.setFloodMap(data.eeMapURLFlood, 'flood', water.App.Z_INDEX_WATER);
					if($("#floodLayerCheckbox").is(":checked")){
						water.instance.setLayerOpacity('flood', parseFloat(localStorage.getItem('flood_transparency')) || 1);
					}
					else{
						water.instance.setLayerOpacity('flood', 0);
					}
					water.instance.waterParams = { 'mapId': data.eeMapIdWater, 'token': data.eeTokenWater, 'tile_url': data.eeMapURLWater };
					water.instance.setWaterMap(data.eeMapURLWater, 'water', water.App.Z_INDEX_WATER);
					if($("#waterLayerCheckbox").is(":checked")){
						water.instance.setLayerOpacity('water', parseFloat(localStorage.getItem('water_transparency')) || 1);
					}
					else{
						water.instance.setLayerOpacity('water', 0);
					}
					water.instance.lcluParams = { 'mapId': data.eeMapIdLCLU, 'token': data.eeTokenLCLU, 'tile_url': data.eeMapURLLCLU };
					water.instance.setLCLUMap(data.eeMapURLLCLU, 'lclu', water.App.Z_INDEX_WATER);
					if($("#lcluLayerCheckbox").is(":checked")){
						water.instance.setLayerOpacity('lclu', parseFloat(localStorage.getItem('lclu_transparency')) || 1);
					}
					else{
						water.instance.setLayerOpacity('lclu', 0);
					}
					water.instance.populationDensityParams = { 'mapId': data.eeMapIdPopulationDensity, 'token': data.eeTokenPopulationDensity, 'tile_url': data.eeMapURLPopulationDensity };
					water.instance.setPopulationDensityMap(data.eeMapURLPopulationDensity, 'populationDensity', water.App.Z_INDEX_WATER);
					if($("#populationDensityLayerCheckbox").is(":checked")){
						water.instance.setLayerOpacity('populationDensity', parseFloat(localStorage.getItem('populationDensity_transparency')) || 1);
					}
					else{
						water.instance.setLayerOpacity('populationDensity', 0);
					}
					water.instance.soilTextureParams = { 'mapId': data.eeMapIdSoilTexture, 'token': data.eeTokenSoilTexture, 'tile_url': data.eeMapURLSoilTexture };
					water.instance.setSoilTextureMap(data.eeMapURLSoilTexture, 'soilTexture', water.App.Z_INDEX_WATER);
					if($("#soilTextureLayerCheckbox").is(":checked")){
						water.instance.setLayerOpacity('soilTexture', parseFloat(localStorage.getItem('soilTexture_transparency')) || 1);
					}
					else{
						water.instance.setLayerOpacity('soilTexture', 0);
					}
					water.instance.healthCareAccessParams = { 'mapId': data.eeMapIdHealthCareAccess, 'token': data.eeTokenHealthCareAccess, 'tile_url': data.eeMapURLHealthCareAccess };
					water.instance.setHealthCareAccessMap(data.eeMapURLHealthCareAccess, 'healthCareAccess', water.App.Z_INDEX_WATER);
					if($("#healthCareAccessLayerCheckbox").is(":checked")){
						water.instance.setLayerOpacity('healthCareAccess', parseFloat(localStorage.getItem('healthCareAccess_transparency')) || 1);
					}
					else{
						water.instance.setLayerOpacity('healthCareAccess', 0);
					}
				}
				$("#spinner-overlay")[0].style.display = "none";
				let codeSnippet = createCodeSnippet(params, areaDataType);
				if (codeSnippet) {
					const blob = new Blob([codeSnippet], { type: 'text/javascript' });
					let downloadBtn = document.querySelector('#download-gee-code')
					downloadBtn.href = URL.createObjectURL(blob);
					downloadBtn.download = `${areaDataType}_gee_code.js`;
					downloadBtn.disabled = false
					downloadBtn.style.opacity = '1'
					downloadBtn.style.cursor = 'pointer'
				}
			},
			error: function (data) {
				document.getElementById("error-modal").style.display = "block";
				console.log(data.responseText);
				$("#spinner-overlay")[0].style.display = "none";
				setTimeout(() => {
					window.location.reload()
				}, 3000);

			}
		});
		this.currentLayer = params
	}
};

function createCodeSnippet(params, data_type){
	let geo_json_list = JSON.parse(params.AoI_cords)
	let latitude = geo_json_list[0][0]
	let longtitude = geo_json_list[0][1]
	let start_year = params.time_start.split("-")[0]
	let end_year = params.time_end.split("-")[0]
	let year_count = params.year_count
	let staticCodeString = ''

	if(data_type == "historical"){
		staticCodeString = `
		Map.setCenter(${latitude}, ${longtitude}, 7);
		var geoJsonBoundaryGeometry = ee.Geometry.Polygon([${geo_json_list}]);
		var areaBoundary = ee.FeatureCollection([ee.Feature(geoJsonBoundaryGeometry)]);

		var	jrcSurfaceWater = ee.ImageCollection('JRC/GSW1_3/YearlyHistory').filter(ee.Filter.calendarRange(${start_year}, ${end_year}, 'year')).map(function(image) {return image.select('waterClass').eq(3);}).sum().clip(areaBoundary)
    	jrcSurfaceWater = jrcSurfaceWater.updateMask(jrcSurfaceWater.gt(0)) 
    	jrcSurfaceWater = jrcSurfaceWater.visualize(min=0, max=1, palette=['#00008B'])
                   
    	var jrcSurfaceFlood = ee.ImageCollection('JRC/GSW1_3/YearlyHistory').filter(ee.Filter.calendarRange(${start_year}, ${end_year}, 'year')).map(function(image) {return image.select('waterClass').eq(2);}).sum().clip(areaBoundary)
    	jrcSurfaceFlood = jrcSurfaceFlood.updateMask(jrcSurfaceFlood.gt(0)) 
    	jrcSurfaceFlood = jrcSurfaceFlood.visualize(min=0, max=1, palette=['#FD0303'])

		var LCLU = ee.ImageCollection("ESA/WorldCover/v200").first().clip(areaBoundary);

		var PopulationDensity = ee.Image('CIESIN/GPWv411/GPW_UNWPP-Adjusted_Population_Density/gpw_v4_population_density_adjusted_to_2015_unwpp_country_totals_rev11_2020_30_sec').clip(areaBoundary);
		PopulationDensity = PopulationDensity.visualize({min : 0.0, max : 1000,  palette : ['ffffe7','FFc869', 'ffac1d','e17735','f2552c', '9f0c21']});
				
		var SoilTexture = ee.Image('OpenLandMap/SOL/SOL_TEXTURE-CLASS_USDA-TT_M/v02').clip(areaBoundary).select('b10');
		SoilTexture = SoilTexture.visualize({min: 1.0, max: 12.0, palette: ['d5c36b','b96947','9d3706','ae868f','f86714','46d143','368f20','3e5a14','ffd557','fff72e','ff5a9d','ff005b']});
		
		var HealthCareAccess = ee.Image('Oxford/MAP/accessibility_to_healthcare_2019').select('accessibility').clip(areaBoundary);
		HealthCareAccess = HealthCareAccess.visualize({  min: 1,  max: 60,  palette: ['FFF8DC', 'FFEBCD', 'FFDEAD', 'F5DEB3', 'DEB887', 'D2B48C', 'CD853F', '8B4513', 'A0522D', '8B4513']});

		Map.addLayer(jrcSurfaceWater, {}, 'Permanent Water Data');
		Map.addLayer(jrcSurfaceFlood, {}, 'Inundated Area Data');
		Map.addLayer(LCLU, {}, "LCLU");
		Map.addLayer(PopulationDensity, {}, 'PopulationDensity');
		Map.addLayer(SoilTexture, {}, 'Soil texture class (USDA system)');
		Map.addLayer(HealthCareAccess, {}, 'HealthCareAccessibility');
		Map.addLayer(areaBoundary, {}, 'Boundary');
		`
	}
	else if (data_type == "unsupervised"){	
		staticCodeString = `Map.setCenter(${latitude}, ${longtitude}, 7);var bangkokBoundaryGeometry = ee.Geometry.Polygon([${geo_json_list}]);var landsat7 = ee.ImageCollection('LANDSAT/LE07/C01/T1_SR').filterBounds(bangkokBoundaryGeometry).filterDate("${params.time_start}","${params.time_end}");var computeNDWI = function(image) {var ndwi = image.normalizedDifference(['B2', 'B4']).rename('NDWI');return image.addBands(ndwi);};var landsatNDWI = landsat7.map(computeNDWI);var ndwiBands = landsatNDWI.select('NDWI');var medianNDWI = ndwiBands.median().clip(bangkokBoundaryGeometry);var training = medianNDWI.sample({region: bangkokBoundaryGeometry,scale: 30,numPixels: 5000});var clusterer = ee.Clusterer.wekaKMeans(3).train(training);var result = medianNDWI.cluster(clusterer);Map.addLayer(result.randomVisualizer(), {}, 'Clusters');Map.addLayer(ee.FeatureCollection([ee.Feature(bangkokBoundaryGeometry)]), {}, 'Boundary');`
	}
	else{
		staticCodeString = `
		Map.setCenter(${latitude}, ${longtitude},7);
		var geoJsonBoundaryGeometry = ee.Geometry.Polygon([${geo_json_list}]);
		var year_count = ${year_count};
		var pink = ['#ffa9bb', '#ff9cac', '#ff8f9e', '#ff8190', '#ff7281', '#ff6171', '#ff4f61', '#ff3b50', '#ff084a'];
		var vizFFMpink =  {min: 0.1, max: 0.8, palette: pink}; 
		var WaterESA2 = ee.ImageCollection("ESA/WorldCover/v200").first().eq(80).selfMask(); 
		var WaterESA1 = ee.ImageCollection("ESA/WorldCover/v100").first().eq(80).selfMask(); 
		var waterHistory = ee.ImageCollection("JRC/GSW1_4/YearlyHistory"); 
		var PermanentWater = waterHistory.map(function(image) {return image.select('waterClass').eq(3);}).sum(); 
		var PermanentWaterFrequency = PermanentWater.divide(year_count); 
		var PermanentWaterFrequencyMap = PermanentWaterFrequency.gt(0).selfMask(); 
		var PermanentWaterLayer = ee.ImageCollection([WaterESA1.rename('waterClass'),WaterESA2.rename('waterClass'), PermanentWaterFrequencyMap]).mosaic().clip(geoJsonBoundaryGeometry);
		var yearsWithWater = waterHistory.map(function(image) {return image.select('waterClass').eq(2);}).sum();
		var floodFrequency = yearsWithWater.divide(year_count);
		var floodFrequencyMap = floodFrequency.where(PermanentWaterLayer.eq(1),0).selfMask().clip(geoJsonBoundaryGeometry);
		var minMax = floodFrequencyMap.reduceRegion(ee.Reducer.minMax());
		//print(minMax);
		var floodFrequencyMap = floodFrequencyMap.where(floodFrequencyMap.gt(0.9),0.90);

		var LCLU = ee.ImageCollection("ESA/WorldCover/v200").first().clip(geoJsonBoundaryGeometry);

		var PopulationDensity = ee.Image('CIESIN/GPWv411/GPW_UNWPP-Adjusted_Population_Density/gpw_v4_population_density_adjusted_to_2015_unwpp_country_totals_rev11_2020_30_sec').clip(geoJsonBoundaryGeometry);
		PopulationDensity = PopulationDensity.visualize({min : 0.0, max : 1000,  palette : ['ffffe7','FFc869', 'ffac1d','e17735','f2552c', '9f0c21']});
				
		var SoilTexture = ee.Image('OpenLandMap/SOL/SOL_TEXTURE-CLASS_USDA-TT_M/v02').clip(geoJsonBoundaryGeometry).select('b10');
		SoilTexture = SoilTexture.visualize({min: 1.0, max: 12.0, palette: ['d5c36b','b96947','9d3706','ae868f','f86714','46d143','368f20','3e5a14','ffd557','fff72e','ff5a9d','ff005b']});
		
		var HealthCareAccess = ee.Image('Oxford/MAP/accessibility_to_healthcare_2019').select('accessibility').clip(geoJsonBoundaryGeometry);
		HealthCareAccess = HealthCareAccess.visualize({  min: 1,  max: 60,  palette: ['FFF8DC', 'FFEBCD', 'FFDEAD', 'F5DEB3', 'DEB887', 'D2B48C', 'CD853F', '8B4513', 'A0522D', '8B4513']});

		Map.addLayer(PermanentWaterLayer, {min: 0, max: 1, opacity: 1.0, palette: ['white','blue','#0d6ee9']}, 'Permanent Water');
		Map.addLayer(floodFrequencyMap, vizFFMpink, 'Flood Frequency Map');
		Map.addLayer(LCLU, {}, 'LCLU');
		Map.addLayer(PopulationDensity, {}, 'PopulationDensity');
		Map.addLayer(SoilTexture, {}, 'Soil texture class (USDA system)');
		Map.addLayer(HealthCareAccess, {}, 'HealthCareAccessibility');
		`
	}
	return staticCodeString
}

water.App.prototype.setFloodMap = function(eeMapURL, name, index) {
	$(".spinner").show();
	// add new layer

	// this.map.overlayMapTypes.setAt(index, mapType);
	this.map.addSource(name, {
		'type': 'raster',
		'tiles': [
			eeMapURL
		],
	});
	this.map.addLayer({
		'id': name+"-layer",
		'type': 'raster',
		'source': name,
		'source-layer': 'watermap-sequences',
	},'waterway-label');

  	$(".spinner").hide();
};

water.App.prototype.setLCLUMap = function(eeMapURL, name, index) {
	$(".spinner").show();
	// add new layer

	// this.map.overlayMapTypes.setAt(index, mapType);
	this.map.addSource(name, {
		'type': 'raster',
		'tiles': [
			eeMapURL
		],
	});
	this.map.addLayer({
		'id': name+"-layer",
		'type': 'raster',
		'source': name,
		'source-layer': 'watermap-sequences',
	},'waterway-label');

  	$(".spinner").hide();
};

water.App.prototype.setPopulationDensityMap = function(eeMapURL, name, index) {
	$(".spinner").show();
	// add new layer

	// this.map.overlayMapTypes.setAt(index, mapType);
	this.map.addSource(name, {
		'type': 'raster',
		'tiles': [
			eeMapURL
		],
	});
	this.map.addLayer({
		'id': name+"-layer",
		'type': 'raster',
		'source': name,
		'source-layer': 'watermap-sequences',
	},'waterway-label');

  	$(".spinner").hide();
};

water.App.prototype.setSoilTextureMap = function(eeMapURL, name, index) {
	$(".spinner").show();
	// add new layer

	// this.map.overlayMapTypes.setAt(index, mapType);
	this.map.addSource(name, {
		'type': 'raster',
		'tiles': [
			eeMapURL
		],
	});
	this.map.addLayer({
		'id': name+"-layer",
		'type': 'raster',
		'source': name,
		'source-layer': 'watermap-sequences',
	},'waterway-label');

  	$(".spinner").hide();
};

water.App.prototype.setHealthCareAccessMap = function(eeMapURL, name, index) {
	$(".spinner").show();
	// add new layer

	// this.map.overlayMapTypes.setAt(index, mapType);
	this.map.addSource(name, {
		'type': 'raster',
		'tiles': [
			eeMapURL
		],
	});
	this.map.addLayer({
		'id': name+"-layer",
		'type': 'raster',
		'source': name,
		'source-layer': 'watermap-sequences',
	},'waterway-label');

  	$(".spinner").hide();
};

water.App.prototype.setHotspotsMap = function(eeMapURL, name, index) {
	$(".spinner").show();
	// add new layer

	// this.map.overlayMapTypes.setAt(index, mapType);
	this.map.addSource(name, {
		'type': 'raster',
		'tiles': [
			eeMapURL
		],
	});
	this.map.addLayer({
		'id': name+"-layer",
		'type': 'raster',
		'source': name,
		'source-layer': 'watermap-sequences',
	},'waterway-label');

  	$(".spinner").hide();
};

// Push map with mapId and token obtained from EE Python
water.App.prototype.setWaterMap = function(eeMapURL, name, index) {

//   $(".spinner").show();
$("#spinner-overlay")[0].style.display = "inline-flex";
  // add new layer

	// this.map.overlayMapTypes.setAt(index, mapType);
	this.map.addSource(name, {
		'type': 'raster',
		'tiles': [
			eeMapURL
		],
		// 'minzoom': 6,
		// 'maxzoom': 14
	});
	this.map.addLayer({
		'id': name+"-layer",
		'type': 'raster',
		'source': name,
		'source-layer': 'watermap-sequences',
	},'waterway-label');


	$("#spinner-overlay")[0].style.display = "none";

};

/**
 * Removes the map layer(s) with the given name.
 * @param {string} name The name of the layer(s) to remove.
 */

water.App.prototype.removeLayer = function(name) {
	if (this.map.getLayer(name+'-layer')){
		this.map.removeLayer(name+"-layer");
	}
	if (this.map.getSource(name)){	
		this.map.removeSource(name);
	}
  
  };

/**
 * Changes the opacity of the map layer(s) with the given name.
 * @param {string} name The name of the layer(s) for which to change opacity.
 * @param {float} value The value to use for opacity of the layer(s).
 */
water.App.prototype.setLayerOpacity = function(name, value) {

  // NEW CODE FOR MAPBOX
  this.map.setPaintProperty(
  	name+"-layer",
  	'raster-opacity',
  	value
  	);

};

/**
 * Toggles map layer(s) on/off.
 * @param {string} name The name of the layer(s) to toggle on/off.
 * @param {boolean} toggle Whether to toggle the layer(s) on (true) or off (false).
 */
 water.App.prototype.toggleLayer = function(name, toggle) {

	if (toggle) {
		if (name == 'water') {
			this.setWaterMap(this.waterParams.tile_url, 'water', water.App.Z_INDEX_WATER);
			water.instance.setLayerOpacity('water', parseFloat($("#transparencyControl").val()));
		} else if (name == 'hand') {
			this.showBackground(this.handParams.tile_url, 'hand', water.App.Z_INDEX_HAND);
			water.instance.setLayerOpacity('hand', parseFloat($("#handControl").val()));
		} else if (name == 'AoI') {
			this.showPopulation(this.aoiParams.tile_url, 'AoI', water.App.Z_INDEX_AOI);
			water.instance.setLayerOpacity('AoI', parseFloat($("#aoiControl").val()));
		}
	} else {
		this.removeLayer(name);
	}

}

// ---------------------------------------------------------------------------------- //
// Layer toggle and opacity control
// ---------------------------------------------------------------------------------- //

water.App.prototype.toggleBoxes = function() {

	$('#checkbox-aoi').on("change", function() {
		water.instance.toggleLayer('AoI', this.checked);
	});
	$('#checkbox-hand').on("change", function() {
		water.instance.toggleLayer('hand', this.checked);
	});
	// $('#checkbox-water').on("change", function() {
	// 	water.instance.toggleLayer('water', this.checked);
	// });

}

water.App.prototype.opacitySliders = function() {

  $("#aoiControl").on("slide", function(slideEvt) {
		water.instance.setLayerOpacity('AoI', slideEvt.value);
  });
  $("#aoiControl").on("slideStop", function(slideEvt) {
		water.instance.setLayerOpacity('AoI', slideEvt.value);
  });
	$("#handControl").on("slide", function(slideEvt) {
		water.instance.setLayerOpacity('hand', slideEvt.value);
  });
  $("#handControl").on("slideStop", function(slideEvt) {
		water.instance.setLayerOpacity('hand', slideEvt.value);
  });

}

// ---------------------------------------------------------------------------------- //
// Alerts
// ---------------------------------------------------------------------------------- //

water.App.prototype.addLoadingLayer = function(name) {

	if (!water.App.LOADING_LAYERS.includes(name)) {
		water.App.LOADING_LAYERS.push(name);
	}
	this.checkLoadingAlert();

}

water.App.prototype.removeLoadingLayer = function(name) {

	if (water.App.LOADING_LAYERS.includes(name)) {
		var temp_index = water.App.LOADING_LAYERS.indexOf(name);
		water.App.LOADING_LAYERS.splice(temp_index, 1);
	}
	this.checkLoadingAlert();

}

water.App.prototype.checkLoadingAlert = function() {

	if (water.App.LOADING_LAYERS.length > 0) {
		$(".spinner").show();
	} else {
		$(".spinner").hide();
	}

}

// ---------------------------------------------------------------------------------- //
// Region selection
// ---------------------------------------------------------------------------------- //

// Initializes the region picker.
water.App.prototype.initRegionPicker = function() {

	// Respond when the user changes the selection
	$("input[name='polygon-selection-method']").change(polygonSelectionMethod);

	// initialize keydown storage variable
	var ctrl_key_is_down = false;
	// initialize number of selected polygons storage variable
	var nr_selected = 0;

	function polygonSelectionMethod() {
		// clear warnings
		$('.warnings span').text('');
		$('.warnings').hide();
		// reset Export button
		$('.export').attr('disabled', true);
		// reset keydown storage
		ctrl_key_is_down = false;
		// get the selected variable name
		var selection  = $("input[name='polygon-selection-method']:checked").val();
		// clear previously selected polygons
		for (var i=0; i<nr_selected; i++) {
			water.instance.removeLayer('selected_polygon');
		}
		// reset number of selected polygons
		nr_selected = 0;
		// reset clicked points
		water.instance.points = [];
		// carry out action based on selection
		if (selection == "Tiles"){
			// cancel drawing
			$('.region .cancel').click();
			// clear existing overlays
			water.instance.removeLayer('adm_bounds');
			$('.region .clear').click();
			// show overlay on map
			water.App.prototype.loadTilesMap();
		} else if (selection == "Adm. bounds"){
			// cancel drawing
			$('.region .cancel').click();
			// clear existing overlays
			water.instance.removeLayer('tiles');
			$('.region .clear').click();
			// show overlay on map
			water.App.prototype.loadAdmBoundsMap();
		} else if (selection == "Draw polygon"){
			// clear existing overlays
			water.instance.removeLayer('adm_bounds');
			water.instance.removeLayer('tiles');
			// setup drawing
			$('.region .draw').click();
		}
	}

	// Respond when the user chooses to draw a polygon.
  $('.region .draw').click(this.setDrawingModeEnabled.bind(this, true));
  // handle actions when user presses certain keys
  $(document).keydown((function(event) {
		// Cancel region selection and related items if the user presses escape.
    if (event.which == 27) {
			// remove drawing mode
			this.setDrawingModeEnabled(false);
			// remove region selection
			$("input[name='polygon-selection-method']:checked").attr('checked', false);
			// clear map overlays
			water.instance.removeLayer('adm_bounds');
			water.instance.removeLayer('tiles');
			for (var i=0; i<nr_selected; i++) {
				water.instance.removeLayer('selected_polygon');
			}
			// clear any existing download links
			$('#link1').removeAttr('href');
			$('#link2').removeAttr('href');
			$('#link3').removeAttr('href');
			$('#link4').removeAttr('href');
			$('#link_metadata').removeAttr('href');
			$('#link_metadata').removeAttr('download');
			// remove download link(s) message
			$('#link1').css('display', 'none');
			$('#link2').css('display', 'none');
			$('#link3').css('display', 'none');
			$('#link4').css('display', 'none');
			$('#link_metadata').css('display', 'none');
			// reset variables
			water.instance.points = [];
			nr_selected = 0;
			// disable export button
			$('.export').attr('disabled', true);
			// hide export panel
			$('.download_panel').css('display', 'none');
		}
		// Allow multiple selection if the user presses and holds down ctrl.
		if (event.which == 17) {
			var selection = $("input[name='polygon-selection-method']:checked").val();
			if (selection == 'Tiles' || selection == 'Adm. bounds') {
				if (ctrl_key_is_down) {
					return;
				}
				ctrl_key_is_down = true;
			}
		}

  }).bind(this));
	// clear ctrl key event if key is released
	$(document).keyup((function(event) {
		if (event.which == 17) {
			ctrl_key_is_down = false;
		}
	}).bind(this));

	$('.region .cancel').click((function() {
		this.setDrawingModeEnabled(false);
		if ($("input[name='polygon-selection-method']:checked").val() == 'Draw polygon') {
			$("input[name='polygon-selection-method']:checked").attr('checked', false);
		}
	}).bind(this));

  // Respond when the user clears the polygon.
  //$('.region .clear').click(this.clearPolygon.bind(this));  // original function
	$('.region .clear').click((function() {
		// try to clear polygon (won't work if no polygon was drawn, try/catch to make it work)
		try {
			this.clearPolygon();
		} catch(err) {
			//console.log('Trying to remove a drawn polygon from map, but results in error:')
			//console.log(err);
		}
		if ($("input[name='polygon-selection-method']:checked").val() == 'Draw polygon') {
			$("input[name='polygon-selection-method']:checked").attr('checked', false);
		}
		$('.warnings span').text('');
		$('.warnings').hide();
	}).bind(this));

};

/**
 * Sets whether drawing on the map is enabled.
 * @param {boolean} enabled Whether drawing mode is enabled.
 */
water.App.prototype.setDrawingModeEnabled = function(enabled) {
	console.log("setDrawingModeEnabled ");
};

var clearMap = function(){
	// remove all polygons

	this.map.data.forEach(function (feature) {
	  this.map.data.remove(feature);
	});
}

// Enable 3D terrain
water.App.prototype.show3D = function () {
	water.instance.map.addSource('mapbox-dem', {
		'type': 'raster-dem',
		'url': 'mapbox://mapbox.mapbox-terrain-dem-v1',
		'tileSize': 512,
		'maxzoom': 14
	});
	// add the DEM source as a terrain layer with exaggerated height
	water.instance.map.setTerrain({ 'source': 'mapbox-dem', 'exaggeration': 1.5 });
	// add a sky layer that will show when the map is highly pitched
	water.instance.map.addLayer({
		'id': 'sky',
		'type': 'sky',
		'paint': {
			'sky-type': 'atmosphere',
			'sky-atmosphere-sun': [0.0, 0.0],
			'sky-atmosphere-sun-intensity': 15
		}
	});

}

// Disable 3D terrain
water.App.prototype.hide3D = function () {
	water.instance.map.setTerrain('')
	water.instance.map.removeSource('mapbox-dem')
	water.instance.map.removeLayer('sky')
}

/**
 * Creates a drawing manager for the passed-in map.
 * @param {google.maps.Map} map The map for which to create a drawing
 *     manager.
 * @return {google.maps.drawing.DrawingManager} A drawing manager for
 *     the given map.
 */
water.App.createDrawingManager = function(map) {
	console.log("createDrawingManager");
  return null

}

water.App.setMapCoords = function(center, zoom) {

	water.instance.map.panTo(center);
	water.instance.map.setZoom(zoom);
}


water.App.prototype.loadZoomInOut = function() {

	this.map.addControl(new mapboxgl.NavigationControl({
		visualizePitch: true
	}));
}

  water.App.prototype.loadSearchBox = function() {
	return null;
}

/** @type {string} The Earth Engine API URL. */
water.App.EE_URL = 'https://earthengine.googleapis.com';

/** @type {number} The default zoom level for the map. */
water.App.DEFAULT_ZOOM = 2;

/** @type {number} The max allowed zoom level for the map. */
water.App.MAX_ZOOM = 14;

/** @type {object} The default center of the map. */
water.App.DEFAULT_CENTER = {lng: 40.88, lat: 15.86};

/** @type {string} The default date format. */
water.App.DATE_FORMAT = 'yyyy-mm-dd';

/** @type {number} The z-index of map layers. */
water.App.Z_INDEX_AOI = 0;
water.App.Z_INDEX_HAND = 1;
water.App.Z_INDEX_PCNT = 2;
water.App.Z_INDEX_CLOUD = 3;
water.App.Z_INDEX_WATER = 4;
water.App.Z_INDEX_POLY  = 5;

/** @type {number} The minimum allowed time period in days. */
water.App.MINIMUM_TIME_PERIOD_REGULAR = 90;

/** @type {number} The minimum allowed time period in days when climatology is activated. */
water.App.MINIMUM_TIME_PERIOD_CLIMATOLOGY = 1095;

/** @type {number} The max allowed selection of polygons for download/export. */
water.App.MAX_SELECTION = 4;

/** @type {number} Soft limit on download area size. */
water.App.AREA_LIMIT_1 = 15000;

/** @type {number} Hard limit on download area size. */
water.App.AREA_LIMIT_2 = 20000;

/** @type {object} List storing map layers that are loading. */
water.App.LOADING_LAYERS = [];

/** @type {boolean} stores whether the example with months slider is active. */
water.App.EXAMPLE_MONTHS_ACTIVE = false;


/** @type {object} The input parameters for different examples. */
// default values
water.App.DEFAULT_PARAMS = {
	time_start: '2021-01-01',
	time_end: '2021-06-30',
	climatology: 0,
	month_index: 1,
	defringe: true,
	pcnt_perm: 40,
	pcnt_temp: 8,
	water_thresh: 0.3,
	veg_thresh: 0.6,
	hand_thresh: 50,
	cloud_thresh: 80
};
water.App.Prompt = {}
// Validation on Prompt
document.addEventListener('DOMContentLoaded', function() {
	floodAndWaterLayersChecked();
	toggleLCLULegend();
	togglePopulationDensityLegend();
	toggleSoilTextureLegend();
	toggleHealthCareAccessLegend();
	const inputBox = document.getElementById('inputBox');
	const errorSpan = document.querySelector('.error');
  
	inputBox.addEventListener('input', function(event) {
	  const target = event.target;
	  let inputValue = target.value;
  
	  if (inputValue=='') {
		errorSpan.style.display = 'inline-flex';
		return;
	  }
	  errorSpan.style.display = 'none';

	});
  });
function fetchResponse(){
	var inputElement = document.querySelector('.chat-input');
	var inputValue = inputElement.value;
	var errorMsg = document.querySelector('.error');
	var yearErrorMsg = document.querySelector('.year-error');

	if(inputValue != ''){
		errorMsg.style.display = 'none';
		if (!$("#floodHotspotCheckbox").is(":checked")){
			var jsonData = {
				"message": inputValue
			};
			getContentResult(jsonData);
		}
		else{
			yearErrorMsg.style.display = 'none';
			//for only when flood hotspot is checked

			//regular expression to get year from and year to 
			var yearPattern = /\b\d{4}\b/g;
			var years = inputValue.match(yearPattern);
			if (years==null){
				const pattern = /(?:for|over|in|concerning|during) (?:the )?(?:past|last|previous) (\d+) years?/i;

				// Initialize start and end years
				const endYear = new Date().getFullYear();
				let startYear = endYear;
			
				// Extract the number of years from the phrase
				const match = inputValue.match(pattern);
				if (match) {
					const years = parseInt(match[1]);
					startYear -= years;
					var jsonData = {
						"message": inputValue
					};
					if(years<5 || years >25){
						yearErrorMsg.style.display = 'inline-flex';
					}
					else{
						flood_hotspot_year_from  = startYear;
						$("#yearControl").slider("setValue", parseInt(years));
						updateYearSliderValue(parseInt(years))
						getContentResult(jsonData);
					}
				}
				else{
					yearErrorMsg.style.display = 'inline-flex';
				}
			}
			else if (years[0] && years[1] && years[1]-years[0] >= 5 && years[1]-years[0] <= 25){
				var jsonData = {
					"message": inputValue
				};
				flood_hotspot_year_from  = years[0];
				$("#yearControl").slider("setValue", parseInt(years[1]-years[0]));
				updateYearSliderValue(parseInt(years[1]-years[0]))
				getContentResult(jsonData);
				
			}
			else{
				yearErrorMsg.style.display = 'inline-flex';
			}
		}
	}
	else{
		errorMsg.style.display = 'inline-flex';
	}
	
}
function getContentResult(jsonData) {
    	var inputElement = document.querySelector('.chat-input');
		document.getElementById("spinner-overlay").style.display = "inline-flex";
		document.querySelector(".mapboxgl-ctrl-top-right").style.zIndex = 0;
		$.ajax({
			url: "/chatGPT",
			type: "POST",
			contentType: "application/json",
			data: JSON.stringify(jsonData),
			dataType: "json",
			success: function (data) {
				removePreviousLayers();
				try{
					water.instance.gptResponse = JSON.parse(data.message).response[0];
				}
				catch(err){
					console.log(err);
					alert('There has been an error');
					window.location.reload()
				}
				countryId =water.instance.gptResponse.CountryCode;
				if (document.getElementById('historicalDataCheckbox').checked){
					document.getElementById("myTextarea").textContent = water.instance.gptResponse.Content;
				}
				else if(document.getElementById('floodHotspotCheckbox').checked){
					var completeJsonResponse = JSON.parse(data.message).response
					var contentResponse = ``
					completeJsonResponse.forEach(function(element) {
						contentResponse += `${element.start_date} to ${element.end_date}: ${element.Content}\n\n`

					});
					document.getElementById("myTextarea").style.whiteSpace = "pre-line";
					document.getElementById("myTextarea").textContent = contentResponse
				}
				inputElement.value = '';
				document.getElementById("spinner-overlay").style.display = "none";
				document.querySelector(".result-box").style.display = "inline";
				document.querySelector(".chat-box").style.display = "none";
				document.querySelector(".mapboxgl-ctrl-top-right").style.zIndex = 1
				$('#promptModal').modal('show');
				water.instance.zoomToCountry(countryId)
			},
			error: function (data) {
				inputElement.value = '';
				document.getElementById("spinner-overlay").style.display = "none";
				document.querySelector(".mapboxgl-ctrl-top-right").style.zIndex = 1
				console.log(data.responseText);
			}
		});
}
function closeInfoModal(){
	let modal = document.getElementById("promptModal");
	let modalBackdrop = document.querySelector(".modal-backdrop")
    modal.style.display = "none";
	if(modalBackdrop){
    	modalBackdrop.style.display = "none";
	}
}


function closeMsgModal(){
	let modal = document.getElementById("MsgModal");
	let modalBackdrop = document.querySelector(".modal-backdrop")
    modal.style.display = "none";
	if(modalBackdrop){
    	modalBackdrop.style.display = "none";
	}
}

// Show 3D Building view
water.App.prototype.showBuildings = function () {
	const layers = water.instance.map.getStyle().layers;
	const labelLayerId = layers.find(
		(layer) => layer.type === 'symbol' && layer.layout['text-field']
	).id;
	water.instance.map.addLayer(
		{
			'id': 'add-3d-buildings',
			'source': 'composite',
			'source-layer': 'building',
			'filter': ['==', 'extrude', 'true'],
			'type': 'fill-extrusion',
			'minzoom': 15,
			'paint': {
				'fill-extrusion-color': '#1f3254',
				'fill-extrusion-height': [
					'interpolate',
					['linear'],
					['zoom'],
					15,
					0,
					15.05,
					['get', 'height']
				],
				'fill-extrusion-base': [
					'interpolate',
					['linear'],
					['zoom'],
					15,
					0,
					15.05,
					['get', 'min_height']
				],
				'fill-extrusion-opacity': 0.6
			}
		},
		labelLayerId
	);
}

// Hide 3D Building view
water.App.prototype.hideBuildings = function () {
	water.instance.map.removeLayer('add-3d-buildings');
}
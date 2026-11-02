// Property preview behaviour. Classic script supports direct-file previews.
(() => {
  const finder = document.getElementById('finder');
  const demoForm = document.getElementById('postcodeDemoForm');
  const postcodeInput = document.getElementById('demoPostcode');
  const scanButton = document.getElementById('scanButton');
  const demoStage = document.getElementById('demoMapStage');
  const scanLabel = document.getElementById('demoMapStatus');
  const demoResult = document.getElementById('demoResult');
  const demoMatchCount = document.getElementById('demoMatchCount');
  const demoResultCopy = document.getElementById('demoResultCopy');
  const demoMapLoader = document.getElementById('demoMapLoader');
  const demoMapLocation = document.getElementById('demoMapLocation');
  const demoOptions = document.querySelectorAll('.demo-filter');
  const demoReset = document.getElementById('demoReset');
  const postcodeError = document.getElementById('demoPostcodeError');
  const selectedTypes = new Set(['solar']);
  const demoTypes = {
    solar: { label: 'solar opportunities' },
    renovation: { label: 'renovation opportunities' },
    pools: { label: 'swimming pool opportunities' }
  };
  let currentScan = 0;
  let scanning = false;

  demoOptions.forEach(option => {
    option.addEventListener('click', () => {
      const type = option.dataset.demoType;
      if (selectedTypes.has(type)) selectedTypes.delete(type); else selectedTypes.add(type);
      option.classList.toggle('active', selectedTypes.has(type));
      option.setAttribute('aria-pressed', String(selectedTypes.has(type)));
    });
  });

  function normalizedUkPostcode(value) {
    const compact = value.trim().replace(/\s+/g, '').toUpperCase();
    // Shape check before authoritative postcode lookup. Does not guess at an unknown address.
    const valid = /^(?:GIR0AA|[A-Z]{1,2}[0-9][A-Z0-9]?[0-9][A-Z]{2})$/.test(compact);
    return valid ? `${compact.slice(0, -3)} ${compact.slice(-3)}` : null;
  }
  function postcodeValidationError(message) {
    postcodeError.textContent = message || '';
    postcodeError.hidden = !message;
    postcodeInput.setAttribute('aria-invalid', String(Boolean(message)));
  }
  postcodeInput.addEventListener('input', () => {
    postcodeInput.setCustomValidity('');
    postcodeValidationError('');
  });

  // Offline-safe examples. Both coordinates are sourced from public UK postcode data.
  const knownDemoPostcodes = {
    'BH14 8NX': {latitude:50.721175,longitude:-1.941286},
    'SW1A 1AA': {latitude:51.501009,longitude:-0.141588}
  };
  // Real geographical centroid from Postcodes.io for other valid UK postcodes.
  async function lookupPostcode(postcode) {
    if (knownDemoPostcodes[postcode]) return knownDemoPostcodes[postcode];
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 9000);
    try {
      const response = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(postcode.replace(/\s/g, ''))}`, {signal:controller.signal});
      if (response.status === 404) throw new Error('This postcode was not found. Please enter a current UK postcode.');
      if (!response.ok) throw new Error('Postcode lookup is temporarily unavailable. Try again.');
      const body = await response.json();
      if (!body.result || !Number.isFinite(body.result.latitude) || !Number.isFinite(body.result.longitude)) {
        throw new Error('Map coordinates are unavailable for this postcode.');
      }
      return body.result;
    } catch (error) {
      if (error.name === 'AbortError' || error instanceof TypeError) {
        throw new Error('An internet connection is needed to locate this postcode on the real UK map.');
      }
      throw error;
    } finally { clearTimeout(timer); }
  }

  function numericHash(value) {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i++) { hash ^= value.charCodeAt(i); hash = Math.imul(hash, 16777619); }
    return hash >>> 0;
  }
  function pseudoRandom(seed) {
    let state = seed >>> 0;
    return () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
  }
  // Vector map: OpenFreeMap + MapLibre; avoids tile.openstreetmap.org's blocked-image tiles.
  // Falls back to bundled illustration if a network provider is unavailable.
  const realMap = document.getElementById('demoRealMap');
  const overlay = document.getElementById('demoMapOverlay');
  const attribution = document.getElementById('demoMapAttribution');
  const zoomControls = document.getElementById('demoZoomControls');
  const NS = 'http://www.w3.org/2000/svg';
  const OPENFREEMAP_CREDIT = '© <a href="https://openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a> · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a> · <a href="https://openfreemap.org/" target="_blank" rel="noopener">OpenFreeMap</a>';
  let mapState = null;
  let vectorMap = null;
  let vectorMapReady = false;
  let mapSequence = 0;
  function project(lon, lat, z) {
    const sin = Math.sin(Math.max(-85.0511,Math.min(85.0511,lat))*Math.PI/180);
    const scale = 256*2**z;
    return { x: (lon+180)/360*scale, y: (0.5-Math.log((1+sin)/(1-sin))/(4*Math.PI))*scale };
  }
  function svgNode(tag,attrs) {
    const el=document.createElementNS(NS,tag);
    for (const [k,v] of Object.entries(attrs)) el.setAttribute(k,String(v));
    return el;
  }
  // Bundled monochrome street illustration. Markers are separate animated SVG elements.
  // Coordinates refer to the cleaned 1260x726 preview image, not real household positions.
  const demoTargetPositions = [
    [447,83],[742,130],[447,130],[465,158],[590,251],[966,272],
    [333,287],[911,302],[788,312],[443,319],[946,343],[264,367],
    [88,371],[1076,387],[750,391],[163,452],[949,453],[459,475],
    [819,476],[87,506],[214,541],[846,613],[794,640],[271,662],
    [940,683],[389,689],[894,702],[220,700],[774,713]
  ];
  function makeOverlay(centerLat,centerLon,postcode) {
    overlay.replaceChildren();
    if (!mapState) return;
    const width=realMap.clientWidth||320, height=realMap.clientHeight||238;
    overlay.setAttribute('viewBox',`0 0 ${width} ${height}`);
    // CSS object-fit:cover; synchronise marker locations with underlying street image.
    const scale=Math.max(width/1260,height/726);
    const cropX=(1260*scale-width)/2, cropY=(726*scale-height)/2;
    // Vary reveal order on each scan, without changing where the example properties sit.
    const reveal=pseudoRandom(numericHash(postcode+'|'+currentScan));
    const pins=demoTargetPositions.map(([px,py])=>({x:px*scale-cropX,y:py*scale-cropY,order:reveal()}))
      .sort((a,b)=>a.order-b.order);
    pins.forEach((pin,i)=>{
      if(pin.x<-20||pin.y<-20||pin.x>width+20||pin.y>height+20)return;
      const group=svgNode('g',{'class':'demo-target'});
      group.style.setProperty('--target-delay',`${(0.06+i*.055).toFixed(3)}s`);
      group.appendChild(svgNode('circle',{'class':'demo-target-pulse',cx:pin.x,cy:pin.y,r:6}));
      group.appendChild(svgNode('circle',{'class':'demo-target-glow',cx:pin.x,cy:pin.y,r:7}));
      group.appendChild(svgNode('circle',{'class':'demo-target-core',cx:pin.x,cy:pin.y,r:3.7}));
      overlay.appendChild(group);
    });
  }
  function showOfflineMap() {
    stopTargetPulse();
    if(vectorMap){try{vectorMap.remove();}catch(e){}vectorMap=null;}
    vectorMapReady=false;
    realMap.classList.add('is-fallback');
    demoMapLocation.textContent = `${mapState.postcode} · PREVIEW`;
    attribution.textContent = '';
     attribution.hidden = true;
    scanLabel.textContent = 'Demo street-map rendering (offline)';
    zoomControls.hidden = true;
    makeOverlay(mapState.originalLat,mapState.originalLon,mapState.postcode);
  }
  function featureCollection(features=[]) {return {type:'FeatureCollection',features};}
  function geoCircle(lon,lat,metres){
    const coords=[];
    for(let i=0;i<=72;i++){
      const a=i*2*Math.PI/72;
      coords.push([lon+metres*Math.cos(a)/(111320*Math.cos(lat*Math.PI/180)),lat+metres*Math.sin(a)/111320]);
    }
    return featureCollection([{type:'Feature',properties:{},geometry:{type:'Polygon',coordinates:[coords]}}]);
  }
  function geoMarkers(lon,lat,postcode) {
    const rand=pseudoRandom(numericHash(postcode+[...selectedTypes].sort().join('|')));
    const features=[];
    for(let i=0;i<32;i++){
      const a=2*Math.PI*rand(),d=95+675*Math.sqrt(rand());
      features.push({type:'Feature',properties:{},geometry:{type:'Point',coordinates:[lon+d*Math.cos(a)/(111320*Math.cos(lat*Math.PI/180)),lat+d*Math.sin(a)/111320]}});
    }
    return featureCollection(features);
  }

  // Monochrome map colours: midnight navy, graphite, and cool slate.
  // Demo markers and the search radius are added later using LOCAYTER's brand colours.
  function enhanceDarkStreetStyle(map) {
    for (const layer of (map.getStyle()?.layers || [])) {
      const id = layer.id.toLowerCase();
      try {
        if (layer.type === 'background') {
          map.setPaintProperty(layer.id,'background-color','#0b1422');
        } else if (layer.type === 'fill') {
          let colour = '#152335';
          if (/(water|river|lake|ocean|sea|canal)/.test(id)) colour='#081321';
          else if (/(building|house|structure)/.test(id)) colour='#354153';
          else if (/(park|grass|forest|wood|green|landuse|landcover|vegetation|pitch|garden)/.test(id)) colour='#172537';
          else if (/(residential|neighbourhood|industrial|commercial)/.test(id)) colour='#1d2a3b';
          map.setPaintProperty(layer.id,'fill-color',colour);
        } else if (layer.type === 'line') {
          const road=/(road|street|transportation|highway|bridge|tunnel|motorway)/.test(id);
          const casing=/(case|casing|outline|border)/.test(id);
          const major=/(primary|trunk|motorway|major|secondary)/.test(id);
          let colour=road ? (casing ? '#27384a' : major ? '#a0adbc' : '#8291a4') : '#39495c';
          if (/(water|river|stream)/.test(id)) colour='#25394c';
          map.setPaintProperty(layer.id,'line-color',colour);
          if (road) map.setPaintProperty(layer.id,'line-opacity',.95);
        } else if (layer.type === 'symbol') {
          // Preserve label hierarchy, but remove colourful place names and road shields.
          if (layer.paint?.['text-color'] !== undefined) map.setPaintProperty(layer.id,'text-color','#a6b4c5');
          if (layer.paint?.['text-halo-color'] !== undefined) map.setPaintProperty(layer.id,'text-halo-color','#122032');
        } else if (layer.type === 'circle' && !id.startsWith('demo-')) {
          map.setPaintProperty(layer.id,'circle-color','#7c8a9e');
        }
      } catch (_) { /* Ignore optional paint props unsupported by a provider layer. */ }
    }
  }
  function hasStreetBasemap(map) {
    if (!map.areTilesLoaded()) return false;
    const canvas=map.getCanvas();
    if (!canvas || !canvas.clientWidth || !canvas.clientHeight) return false;
    const styleLayers=(map.getStyle()?.layers || []).filter(layer =>
      layer.type==='line' || layer.type==='fill' || layer.type==='symbol'
    ).filter(layer=>!layer.id.startsWith('demo-'));
    if (!styleLayers.length) return false;
    const samples=[
      [canvas.clientWidth/2,canvas.clientHeight/2],
      [canvas.clientWidth*.25,canvas.clientHeight*.4],
      [canvas.clientWidth*.75,canvas.clientHeight*.65]
    ];
    return samples.some(([x,y])=>{
      try { return map.queryRenderedFeatures([x,y],{layers:styleLayers.map(l=>l.id)}).length>0; }
      catch (_) { return false; }
    });
  }
  async function waitForStreetBasemap(map,timeout=10000){
    const until=Date.now()+timeout;
    while(Date.now()<until){
      if(hasStreetBasemap(map))return;
      await new Promise(resolve=>setTimeout(resolve,420));
    }
    throw new Error('Road map tiles did not render; using built-in street preview');
  }
  let targetPulseTimer=null;
  function stopTargetPulse(){
    if(targetPulseTimer!==null){clearInterval(targetPulseTimer);targetPulseTimer=null;}
  }
  function startTargetPulse(map){
    stopTargetPulse();
    const begin=performance.now();
    targetPulseTimer=setInterval(()=>{
      if(!vectorMapReady||vectorMap!==map||!map.getLayer('demo-target-halo')){
        stopTargetPulse();return;
      }
      const elapsed=(performance.now()-begin)/1000;
      const phase=(elapsed%2.4)/2.4;
      const entrance=Math.min(1,elapsed/1.2);
      try{
        map.setPaintProperty('demo-target-halo','circle-radius',7+phase*11);
        map.setPaintProperty('demo-target-halo','circle-opacity',(.27*(1-phase))*entrance);
        map.setPaintProperty('demo-target-dots','circle-opacity',entrance);
      }catch(_){stopTargetPulse();}
    },75);
  }
  function applyDemoLayers(map,s) {
    if(map.getSource('demo-radius'))return;
    map.addSource('demo-radius',{type:'geojson',data:geoCircle(s.originalLon,s.originalLat,800)});
    map.addLayer({id:'demo-area-fill',type:'fill',source:'demo-radius',paint:{'fill-color':'#73e4e1','fill-opacity':0.075}});
    map.addLayer({id:'demo-area-line',type:'line',source:'demo-radius',paint:{'line-color':'#73e4e1','line-opacity':.76,'line-width':1.4,'line-dasharray':[2,2]}});
    map.addSource('demo-postcode-center',{type:'geojson',data:featureCollection([{type:'Feature',properties:{},geometry:{type:'Point',coordinates:[s.originalLon,s.originalLat]}}])});
    map.addLayer({id:'demo-centre-halo',type:'circle',source:'demo-postcode-center',paint:{'circle-radius':15,'circle-color':'#73e4e1','circle-opacity':.19}});
    map.addLayer({id:'demo-centre-dot',type:'circle',source:'demo-postcode-center',paint:{'circle-radius':5,'circle-color':'#73e4e1','circle-stroke-color':'#fff','circle-stroke-width':1.6}});
    map.addSource('demo-targets',{type:'geojson',data:geoMarkers(s.originalLon,s.originalLat,s.postcode)});
    map.addLayer({id:'demo-target-halo',type:'circle',source:'demo-targets',paint:{'circle-radius':9,'circle-color':'#ff675c','circle-opacity':.14}});
    map.addLayer({id:'demo-target-dots',type:'circle',source:'demo-targets',paint:{'circle-radius':3.7,'circle-color':'#ff675c','circle-stroke-color':'#fff','circle-stroke-width':1.15}});
    startTargetPulse(map);
  }
  async function prepareMap(lon,lat,postcode) {
    const attempt=++mapSequence;
    mapState={lon,lat,originalLon:lon,originalLat:lat,postcode,zoom:13};
    realMap.classList.add('is-fallback');
    zoomControls.hidden=true;
    makeOverlay(lat,lon,postcode);
    // External scripts are optional: a missing CDN never blocks the conversion demonstration.
    if(typeof window.maplibregl==='undefined') {showOfflineMap();return;}
    stopTargetPulse();
    if(vectorMap) {try{vectorMap.remove();}catch(e){}vectorMap=null;}
    vectorMapReady=false;
    let map, timeoutId;
    try {
      map=new window.maplibregl.Map({
        container:'demoVectorMap',
        style:'https://tiles.openfreemap.org/styles/dark',
        center:[lon,lat],zoom:13.2,minZoom:11,maxZoom:17,
        attributionControl:false,dragRotate:false,pitchWithRotate:false
      });
      vectorMap=map;
      await new Promise((resolve,reject)=>{
        let settled=false;
        const finish=(error)=>{
          if(settled)return;
          settled=true;clearTimeout(timeoutId);
          if(error)reject(error);else resolve();
        };
        timeoutId=setTimeout(()=>finish(new Error('Map service timeout')),12500);
        map.once('load',()=>finish(null));
        map.on('error',event=>{if(!map.isStyleLoaded()) console.warn('Map style could not load:',event.error);});
      });
      if(attempt!==mapSequence){map.remove();return;}
      enhanceDarkStreetStyle(map);
      map.resize();
      await waitForStreetBasemap(map,9500);
      if(attempt!==mapSequence){map.remove();return;}
      applyDemoLayers(map,mapState);
      vectorMapReady=true;
      realMap.classList.remove('is-fallback');
      zoomControls.hidden=false;
      map.resize();
      attribution.innerHTML=OPENFREEMAP_CREDIT;
       attribution.hidden=false;
      scanLabel.textContent=`Map centred on ${postcode}`;
    }catch(error){
      console.warn('Live map could not display road tiles; showing built-in street preview:',error);
      if(attempt===mapSequence)showOfflineMap();
      else if(map){try{map.remove();}catch(e){}}
    }
  }
  function zoomMap(delta){
    if(!vectorMapReady||!vectorMap)return;
    vectorMap.easeTo({zoom:Math.min(17,Math.max(11,vectorMap.getZoom()+delta)),duration:350});
  }
  document.getElementById('demoZoomIn').addEventListener('click',()=>zoomMap(1));
  document.getElementById('demoZoomOut').addEventListener('click',()=>zoomMap(-1));
  window.addEventListener('resize',()=>{
    if(vectorMapReady&&vectorMap)vectorMap.resize();
    else if(mapState&&!demoStage.hidden)makeOverlay(mapState.originalLat,mapState.originalLon,mapState.postcode);
  });
  let lastMatchCount=null;
  function randomMatchCount(){
    let count=50+Math.floor(Math.random()*201); // 50-250 inclusive, freshly drawn per scan.
    if(count===lastMatchCount)count=50+((count-49)%201); // Never show an identical consecutive result.
    lastMatchCount=count;
    return count;
  }
  const delay = millis => new Promise(resolve => setTimeout(resolve,millis));

  demoForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (scanning) return;
    const postcode = normalizedUkPostcode(postcodeInput.value);
    if (!selectedTypes.size) { postcodeValidationError('Select at least one search filter to continue.'); return; }
    if (!postcode) { postcodeValidationError('Enter a valid UK postcode, for example BH14 8NX or SW1A 1AA.'); postcodeInput.focus(); return; }
    postcodeValidationError('');
    postcodeInput.value = postcode;
    const thisScan = ++currentScan;
    const simulatedMatchCount=randomMatchCount();
    scanning = true;
    scanButton.disabled = true;
    scanButton.textContent = 'Locating postcode…';
    let area;
    try { area = await lookupPostcode(postcode); }
    catch(error) {
      if (thisScan === currentScan) {
        postcodeValidationError(error.message || 'Unable to locate this postcode.');
        scanButton.disabled = false;
        scanButton.textContent = 'Scan area';
        scanning = false;
      }
      return;
    }
    if (thisScan !== currentScan) return;
    demoForm.hidden = true;
    demoStage.hidden = false;
    demoResult.hidden = true;
    finder.classList.add('scanning');
    demoMapLoader.hidden = false;
    demoMapLoader.classList.remove('is-error');
    demoMapLoader.textContent = 'Preparing postcode map…';
    scanLabel.textContent = `Scanning around ${postcode}…`;
    demoMapLocation.textContent = `${postcode} · UK`;
    const lon = area.longitude, lat = area.latitude;
    try {
      await Promise.all([prepareMap(lon,lat,postcode),delay(1150)]);
      if (thisScan !== currentScan) return;
      demoMapLoader.hidden = true;
      await delay(440);
      if (thisScan !== currentScan) return;
      const total = simulatedMatchCount;
      finder.classList.remove('scanning');
      demoMatchCount.textContent = total.toLocaleString('en-GB');
      demoResultCopy.textContent = `properties found in ${postcode} matching your search parameters.`;
      demoResult.hidden = false;
    } catch (error) {
      // Even an unexpected tile error should never strand the visitor on an error screen.
      console.warn('LOCAYTER map preview:', error);
      if (thisScan === currentScan) {
        if(!mapState)mapState={lon,lat,originalLon:lon,originalLat:lat,postcode,zoom:13};
        showOfflineMap();
        finder.classList.remove('scanning');
        demoMapLoader.hidden = true;
        demoMatchCount.textContent=String(simulatedMatchCount);
        demoResultCopy.textContent=`properties found in ${postcode} matching your search parameters.`;
        demoResult.hidden=false;
      }
    } finally {
      if (thisScan === currentScan) {
        scanButton.disabled = false;
        scanButton.textContent = 'Scan area';
        scanning = false;
      }
    }
  });

  demoReset.addEventListener('click', () => {
    currentScan += 1; // Invalidates any in-flight scan/animation.
    mapSequence += 1;
    if(vectorMap){try{vectorMap.remove();}catch(e){}vectorMap=null;vectorMapReady=false;}
    finder.classList.remove('scanning');
    demoStage.hidden = true;
    demoForm.hidden = false;
    demoResult.hidden = true;
    demoMapLoader.hidden = true;
    scanButton.disabled = false;
    scanButton.textContent = 'Scan area';
    scanning = false;
  });
})();

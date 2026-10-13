#target photoshop
(function(){var s=app.activeDocument,u=app.preferences.rulerUnits,o=app.displayDialogs,t=null,m=null;var folder=new Folder('F:/blog/Stargazer-Lucid-Dream/assets/检索页/v3');
function save(n,rect){m=t.duplicate('v3 flattened '+n,true);try{m.crop(rect);m.saveAs(new File((n==='composite'?'F:/blog/Stargazer-Lucid-Dream/.scratch/starry-search/evidence/v3-20261012':folder.fsName)+'/'+n+'-v3.png'),new PNGSaveOptions(),true,Extension.LOWERCASE);}finally{m.close(SaveOptions.DONOTSAVECHANGES);m=null;app.activeDocument=t;}}
try{app.preferences.rulerUnits=Units.PIXELS;app.displayDialogs=DialogModes.NO;t=s.duplicate('v3 原稿图层导出副本',false);
var a=t.layerSets.getByName('画板 1');t.activeLayer=a;var d=new ActionDescriptor(),r=new ActionReference();r.putIdentifier(charIDToTypeID('Lyr '),a.id);d.putReference(charIDToTypeID('null'),r);var ab=new ActionDescriptor();ab.putInteger(stringIDToTypeID('artboardBackgroundType'),3);d.putObject(stringIDToTypeID('artboard'),stringIDToTypeID('artboard'),ab);executeAction(stringIDToTypeID('editArtboardEvent'),d,DialogModes.NO);
var root=a.layerSets.getByName('检索页').layerSets.getByName('检索').layerSets.getByName('设计图'),b=root.layerSets.getByName('底图'),l=root.layerSets.getByName('左侧'),rr=root.layerSets.getByName('右侧');
save('composite',[2944,165,4861,1449]);l.visible=false;rr.visible=false;save('base',[2944,165,4861,1449]);b.visible=false;
function onlyLeft(n){l.visible=true;rr.visible=false;for(var i=0;i<l.layers.length;i++)l.layers[i].visible=l.layers[i].name===n;}
onlyLeft('Starchart');save('star-chart',[3542,181,3910,294]);onlyLeft('筛选');save('filters',[3051,405,3434,502]);onlyLeft('搜索栏');save('frame',[3110,275,4304,415]);onlyLeft('折叠箭头');save('arrow',[4304,179,4359,227]);l.visible=false;rr.visible=true;
function onlyRight(n){for(var i=0;i<rr.layers.length;i++)rr.layers[i].visible=rr.layers[i].name===n;}
onlyRight('index');save('index',[4527,211,4702,264]);onlyRight('NAME');save('name',[4372,350,4446,371]);onlyRight('OBS&ID');save('id',[4803,334,4833,371]);onlyRight('退出按钮');save('close',[4802,176,4842,215]);
}catch(e){var f=new File(folder.fsName+'/export-error.txt');f.open('w');f.write(e.toString()+' '+e.line);f.close();}finally{if(m)m.close(SaveOptions.DONOTSAVECHANGES);if(t)t.close(SaveOptions.DONOTSAVECHANGES);app.activeDocument=s;app.preferences.rulerUnits=u;app.displayDialogs=o;}})();

#target photoshop
(function () {
 var source=app.activeDocument, originalLayer=source.activeLayer, oldUnits=app.preferences.rulerUnits, oldDialogs=app.displayDialogs, temp=null;
 var folder=new Folder('F:/blog/Stargazer-Lucid-Dream/.scratch/starry-search/evidence/v3-20261012/native-alpha');folder.create();
 function get(root,names){for(var i=0;i<names.length;i++)root=root.layers.getByName(names[i]);return root;}
 function saveCrop(name, rect){
  var copy=temp.duplicate('v3 export '+name,false);
  try {copy.crop(rect); var opts=new PNGSaveOptions();opts.interlaced=false;copy.saveAs(new File(folder.fsName+'/'+name+'.png'),opts,true,Extension.LOWERCASE);}
  finally {copy.close(SaveOptions.DONOTSAVECHANGES);app.activeDocument=temp;}
 }
 try {
  app.preferences.rulerUnits=Units.PIXELS;app.displayDialogs=DialogModes.NO;
  var original=get(source,['画板 1','检索页']);
  temp=app.documents.add(1917,1284,72,'检索 v3 临时导出',NewDocumentMode.RGB,DocumentFill.TRANSPARENT);
  app.activeDocument=source;var root=original.duplicate(temp,ElementPlacement.PLACEATBEGINNING);app.activeDocument=temp;
  root.layers.getByName('色相/饱和度 12').visible=false; var design=get(root,['检索','设计图']),base=get(design,['底图']),left=get(design,['左侧']),right=get(design,['右侧']);
  var bg=get(base,['底图']),b=bg.bounds;root.translate(-b[0].as('px'),-b[1].as('px'));
  saveCrop('composite-v3',[0,0,1917,1284]);
  left.visible=false;right.visible=false;saveCrop('base-v3',[0,0,1917,1284]);base.visible=false;
  function onlyLeft(name){left.visible=true;right.visible=false;for(var i=0;i<left.layers.length;i++)left.layers[i].visible=left.layers[i].name===name;}
  onlyLeft('Starchart');saveCrop('star-chart-v3',[598,16,966,129]);
  onlyLeft('筛选');saveCrop('filters-v3',[107,240,490,337]);
  onlyLeft('搜索栏');saveCrop('frame-v3',[166,110,1360,250]);
  onlyLeft('折叠箭头');saveCrop('arrow-v3',[1360,14,1415,62]);
  left.visible=false;right.visible=true;
  function onlyRight(name){for(var i=0;i<right.layers.length;i++)right.layers[i].visible=right.layers[i].name===name;}
  onlyRight('index');saveCrop('index-v3',[1583,46,1758,99]);
  onlyRight('NAME');saveCrop('name-v3',[1428,185,1502,206]);
  onlyRight('OBS&ID');saveCrop('id-v3',[1859,169,1889,206]);
  onlyRight('退出按钮');saveCrop('close-v3',[1858,11,1898,50]);
 } catch(e) {var f=new File(folder.fsName+'/export-error.txt');f.open('w');f.write(e.toString()+' line '+e.line);f.close();}
 finally {if(temp)temp.close(SaveOptions.DONOTSAVECHANGES);app.activeDocument=source;source.activeLayer=originalLayer;app.preferences.rulerUnits=oldUnits;app.displayDialogs=oldDialogs;}
})();

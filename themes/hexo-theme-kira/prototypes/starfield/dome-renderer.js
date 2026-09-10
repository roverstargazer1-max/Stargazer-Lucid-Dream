// Ray/sphere intersection maps every pixel to the same world used by article stars.
// No scene library: a small WebGL pass samples the existing painted environment.
let renderer=null;
function createRenderer(image){
  const canvas=document.createElement('canvas');
  const gl=canvas.getContext('webgl',{alpha:true,premultipliedAlpha:false,antialias:false,preserveDrawingBuffer:true});
  if(!gl)return null;
  const vertex='attribute vec2 position;void main(){gl_Position=vec4(position,0.,1.);}';
  const fragment=`precision highp float;
    uniform sampler2D plate;
    uniform vec2 size,center;
    uniform float focal,yaw,pitch,overlay;
    uniform vec3 origin;
    const float PI=3.14159265359;
    float pigmentHash(vec3 p){
      p=fract(p*.3183099+vec3(.17,.31,.53));p*=17.;
      return fract(p.x*p.y*p.z*(p.x+p.y+p.z));
    }
    float pigmentNoise(vec3 p){
      vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
      return mix(mix(mix(pigmentHash(i),pigmentHash(i+vec3(1,0,0)),f.x),
                     mix(pigmentHash(i+vec3(0,1,0)),pigmentHash(i+vec3(1,1,0)),f.x),f.y),
                 mix(mix(pigmentHash(i+vec3(0,0,1)),pigmentHash(i+vec3(1,0,1)),f.x),
                     mix(pigmentHash(i+vec3(0,1,1)),pigmentHash(i+vec3(1,1,1)),f.x),f.y),f.z);
    }
    vec3 paintedGalaxy(vec3 sky,vec3 p,float elevation){
      // World-space brush patches wrap around the dome without a seam at the zenith.
      float broad=pigmentNoise(p*5.4+vec3(4.,9.,2.));
      float brush=pigmentNoise(p*vec3(23.,34.,19.)+vec3(12.,3.,7.))*.72
                 +pigmentNoise(p*vec3(61.,83.,57.)+vec3(2.,8.,13.))*.28;
      float distance=dot(p,normalize(vec3(.84,-.20,.50)))+(broad-.5)*.20;
      float band=1.-smoothstep(.035,.32,abs(distance));
      float highSky=smoothstep(.48,.98,elevation);
      // A few soft-edged pigment layers, without photographic dust or bright bloom.
      float strokes=.30+.30*smoothstep(.26,.40,brush)+.25*smoothstep(.54,.65,brush);
      float broken=.38+.62*smoothstep(.22,.74,broad);
      vec3 wash=mix(vec3(.10,.23,.40),vec3(.23,.19,.38),smoothstep(.30,.73,broad));
      sky=mix(sky,wash,band*highSky*strokes*broken*.48);
      float ribbon=(1.-smoothstep(.018,.105,abs(distance+.045)))*smoothstep(.40,.66,brush);
      return mix(sky,vec3(.19,.29,.45),ribbon*highSky*broken*.13);
    }
    void main(){
      vec2 pixel=vec2(gl_FragCoord.x,size.y-gl_FragCoord.y);
      vec3 ray=normalize(vec3((pixel.x-center.x)/focal,(center.y-pixel.y)/focal,1.));
      float cp=cos(pitch),sp=sin(pitch),ca=cos(yaw),sa=sin(yaw);
      ray=vec3(ray.x,ray.y*cp+ray.z*sp,ray.z*cp-ray.y*sp);
      ray=vec3(ray.x*ca+ray.z*sa,ray.y,ray.z*ca-ray.x*sa);
      float b=dot(origin,ray);
      float t=-b+sqrt(max(0.,b*b-dot(origin,origin)+36000000.));
      vec3 p=normalize(origin+ray*t);
      float elevation=asin(clamp(p.y,-1.,1.));
      float longitude=atan(p.x,p.z);
      float u=abs(2.*fract(longitude/(2.*PI)+.25)-1.);
      // Keep the painted cloud banks in the lower sky, beneath the faint galactic wash.
      float v=clamp(1.-elevation/.90,0.,1.);
      // Match the source's negative space to the opening view; mirroring joins the seam.
      u=1.-u;
      vec2 uv=vec2(u,v);
      vec3 pigment=texture2D(plate,uv).rgb;
      // Suppress isolated baked-in light dots before they can stretch at the poles.
      // Live stars are rendered independently at world coordinates above this pass.
      vec2 stepUV=vec2(.0018,.0054);
      vec3 nearby=(texture2D(plate,uv+vec2(stepUV.x,0.)).rgb+texture2D(plate,uv-vec2(stepUV.x,0.)).rgb+texture2D(plate,uv+vec2(0.,stepUV.y)).rgb+texture2D(plate,uv-vec2(0.,stepUV.y)).rgb)*.25;
      float speck=smoothstep(.035,.10,dot(pigment-nearby,vec3(.25,.65,.10)));
      pigment=mix(pigment,nearby,speck);
      vec3 top=texture2D(plate,vec2(u,.18)).rgb;
      float lum=dot(pigment,vec3(.25,.65,.10));
      float base=dot(top,vec3(.25,.65,.10));
      float cloud=smoothstep(.018,.085,lum-base)*smoothstep(.35,.82,v);
      vec3 zenith=vec3(.014,.105,.27);
      // Collapse all longitudes to one pigment before the pole to avoid radial seams.
      pigment=mix(pigment,zenith,smoothstep(.60,.94,elevation));
      float horizon=smoothstep(-.16,.025,elevation);
      pigment=mix(vec3(.016,.060,.125),pigment,horizon);
      if(overlay>.5){
        // Cloud pigment veils starlight and paths instead of bright flares sitting on top.
        gl_FragColor=vec4(pigment,cloud*.78*horizon);
      }else{gl_FragColor=vec4(paintedGalaxy(pigment,p,elevation),1.);}
    }`;
  const shader=(type,source)=>{
    const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);
    if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;
  };
  const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  const position=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
  const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,image);
  const uniform=Object.fromEntries(['size','center','focal','yaw','pitch','origin','overlay'].map(key=>[key,gl.getUniformLocation(program,key)]));
  return {canvas,draw(w,h,camera,settings,overlay){
    const ratio=Math.min(devicePixelRatio||1,1.5);
    const rw=Math.round(w*ratio),rh=Math.round(h*ratio);
    if(canvas.width!==rw||canvas.height!==rh){canvas.width=rw;canvas.height=rh;gl.viewport(0,0,rw,rh);}
    gl.uniform2f(uniform.size,rw,rh);gl.uniform2f(uniform.center,settings.cx*ratio,settings.cy*ratio);
    gl.uniform1f(uniform.focal,settings.focal*ratio);gl.uniform1f(uniform.yaw,camera.yaw);gl.uniform1f(uniform.pitch,camera.pitch);
    gl.uniform3f(uniform.origin,camera.x,camera.y,camera.z);gl.uniform1f(uniform.overlay,overlay?1:0);
    gl.drawArrays(gl.TRIANGLES,0,6);return canvas;
  }};
}
export function paintDomeEnvironment(ctx,w,h,camera,settings,image,overlay=false){
  if(!image.complete||!image.naturalWidth)return false;
  if(!renderer)renderer=createRenderer(image);
  if(!renderer)return false;
  ctx.drawImage(renderer.draw(w,h,camera,settings,overlay),0,0,w,h);return true;
}

/** Shared vector portrait: the same geometry drives SVG cards and Phaser actors. */
type Point={x:number;y:number};
export type FaceShape={kind:'polygon'|'line';points:Point[];fill?:number;stroke?:number;width?:number}|{kind:'ellipse';x:number;y:number;w:number;h:number;fill?:number;stroke?:number;width?:number};
const INK=0x202333;
const cache=new Map<string,FaceShape[]>();
export function characterFace(type:string):FaceShape[]{
 const previous=cache.get(type);if(previous)return previous;
 const family=type.includes('NT')?'purple':type.includes('NF')?'green':type.endsWith('J')?'blue':'gold';
 let [skin,hair,edge]=({purple:[0xdcc7ed,0x65507d,0x443355],green:[0xc9e8bc,0x518869,0x315f49],blue:[0xc9dff2,0x4e85ba,0x315f8c],gold:[0xffe5a0,0xd79d31,0x916923]})[family];
 if(type==='ISTP'){skin=0xd3d7e3;edge=0x424858;}
 const shapes:FaceShape[]=[];
 const poly=(pairs:number[][],fill:number,stroke=edge,width=1.5)=>shapes.push({kind:'polygon',points:pairs.map(([x,y])=>({x,y})),fill,stroke,width});
 const line=(pairs:number[][],width=1.8,stroke=INK)=>shapes.push({kind:'line',points:pairs.map(([x,y])=>({x,y})),stroke,width});
 const ellipse=(x:number,y:number,w:number,h:number,fill?:number,stroke?:number,width=1.5)=>shapes.push({kind:'ellipse',x,y,w,h,fill,stroke,width});
 // Long silhouettes sit behind the face, short cuts and accessories in front.
 if(['INFJ','INFP','ISFJ','ESFJ','ISFP','ESFP'].includes(type))poly([[-27,-10],[-23,-28],[-8,-40],[15,-32],[28,-9],[22,20],[9,27],[-21,24],[-29,7]],hair);
 poly([[-23,-19],[-6,-29],[18,-23],[25,-5],[21,18],[0,27],[-20,17],[-26,-2]],skin,edge,1.7);
 const cuts:Record<string,number[][]>={
 INTJ:[[-26,-2],[-24,-24],[-5,-39],[21,-30],[25,-11],[10,-20],[0,-10],[-14,-16],[-15,-5]],
 INTP:[[-26,-4],[-33,-12],[-23,-20],[-29,-27],[-10,-27],[-5,-36],[3,-27],[22,-31],[20,-20],[31,-18],[23,-9],[28,-1],[14,-8],[8,-17],[3,-12],[-5,-19],[-15,-9]],
 ENTJ:[[-26,3],[-28,-17],[-19,-22],[-17,-33],[9,-41],[24,-22],[23,-5],[14,-19],[-5,-23],[-15,-17],[-17,-3]],
 ENTP:[[-27,-3],[-29,-15],[-9,-36],[17,-33],[27,-12],[12,-20],[2,-11],[-11,-21],[-23,-10]],
 INFJ:[[-25,19],[-30,1],[-23,-26],[-8,-42],[18,-32],[30,-10],[22,20],[15,26],[21,-6],[7,-24],[-16,-10],[-20,5]],
 INFP:[[-25,21],[-29,7],[-20,-5],[-27,-20],[-15,-34],[14,-43],[18,-27],[8,-11],[-5,-16],[-16,7],[-12,25]],
 ENFJ:[[-25,-4],[-20,-25],[-8,-36],[15,-29],[28,-15],[23,1],[21,-14],[5,-20],[-9,-27],[-19,-17]],
 ENFP:[[-24,6],[-32,-7],[-18,-15],[-27,-29],[-9,-33],[3,-27],[13,-43],[20,-28],[31,-21],[29,2],[20,-11],[12,-16],[8,-9],[-1,-15],[-14,-5]],
 ISTJ:[[-24,-1],[-26,-26],[-15,-28],[-14,-34],[23,-37],[26,-16],[-17,-18]],
 ESTJ:[[-25,3],[-30,-18],[-9,-36],[24,-35],[25,-15],[-14,-18],[-18,-2]],
 ISFJ:[[-25,15],[-26,-10],[-13,-21],[-10,-30],[11,-25],[21,-16],[24,-5],[9,-14],[2,-20],[-5,-7],[-16,-1],[-18,17]],
 ESFJ:[[-23,13],[-28,3],[-31,-6],[-26,-13],[-30,-23],[-25,-30],[-13,-35],[-5,-25],[4,-31],[15,-28],[18,-21],[28,-18],[30,-9],[25,-2],[29,8],[23,16],[17,16],[22,5],[15,-3],[17,-13],[1,-24],[-15,-16],[-21,-1]],
 ISFP:[[-26,5],[-22,-19],[-11,-28],[17,-24],[27,-7],[24,11],[20,-5],[12,-16],[-11,-13],[-19,5],[-20,18]],
 ESTP:[[-25,0],[-29,-14],[-21,-18],[-31,-28],[-17,-30],[-23,-41],[2,-38],[10,-30],[17,-32],[26,-20],[24,-4],[16,-16],[1,-23],[-6,-13],[-12,-16],[-19,-5]],
 ESFP:[[-23,7],[-28,-8],[-20,-29],[-6,-34],[-5,-46],[9,-43],[12,-35],[23,-30],[29,-12],[25,10],[18,17],[23,-1],[9,-17],[4,-11],[-4,-19],[-17,-11]]};
 if(cuts[type])poly(cuts[type],hair);
 if(type==='ISFJ')ellipse(-4,-35,22,17,hair,edge);
 if(type==='ISTP'){
  poly([[-28,-15],[-10,-36],[20,-32],[23,-12],[36,-2],[14,-7],[-9,-15]],0x59636b,0x333b46);
  poly([[6,-23],[20,-21],[22,-14],[4,-15]],0xbac3cd,0x333b46,1.2);
 }
 if(type==='ISFP'){ellipse(-2,-28,54,20,hair,edge);line([[0,-38],[-4,-45],[-2,-48],[2,-46],[3,-41]],2,edge);}
 if(type==='INTP'){line([[-5,-31],[-12,-43],[-18,-46]],1.5);line([[-5,-31],[2,-45],[13,-49]],1.5);ellipse(-18,-46,4,4,INK);ellipse(13,-49,4,4,INK);}
 if(type==='ENTP'){line([[23,-10],[28,-7],[29,8]],2);ellipse(28,7,12,14,0xf3df8e,INK,1.8);}
 // Brows and eyes are deliberately bold enough to read at game scale.
 const eyesY=2;
 if(['INTJ','ENTJ','ESTJ','ENFJ'].includes(type)){line([[-15,-8],[-6,-5]],2.5);line([[6,-5],[15,-9]],2.5);}
 if(type==='ENTP'){line([[-16,-7],[-7,-9]],2);line([[7,-9],[16,-6]],2);}
 if(type==='ESTP'){poly([[-22,-1],[-1,0],[-4,10],[-14,11],[-20,7]],INK,INK,1);poly([[1,0],[23,-2],[19,8],[9,10],[4,6]],INK,INK,1);line([[-3,2],[5,2]],2);}
 else if(type==='ESFP'){for(const x of [-10,10])poly([[x,-4],[x+2,0],[x+6,2],[x+2,4],[x,9],[x-2,4],[x-6,2],[x-2,0]],INK,INK,.5);}
 else if(['INFJ','ISFP','INFP'].includes(type)){for(const x of [-10,10])line(type==='INFP'?[[x-4,3],[x-2,0],[x+1,-1],[x+4,1]]:type==='ISFP'?[[x-4,2],[x-2,4],[x+1,4],[x+4,1]]:[[x-4,2],[x+4,1]],1.8);}
 else{ellipse(-10,eyesY,3.8,4.8,INK);ellipse(10,eyesY,3.8,4.8,INK);}
 if(type==='INTP'){ellipse(-10,2,17,18,undefined,INK,1.8);ellipse(10,1,17,18,undefined,INK,1.8);line([[-2,1],[2,1]],1.5);}
 if(type==='ISTJ'){for(const x of [-11,11]){line([[x-8,-5],[x+8,-5],[x+8,9],[x-8,9],[x-8,-5]],1.8);}line([[-3,0],[3,0]],1.8);}
 if(['ENFJ','ENFP','ESFJ','ESFP'].includes(type))poly([[-8,11],[7,12],[4,18],[-1,20],[-5,17]],INK,INK,1);
 else if(['ENTJ','ENTP'].includes(type))poly([[-6,12],[8,12],[1,18]],0xffffff,INK,1.5);
 else if(type==='ESTJ')poly([[-3,12],[2,10],[6,17],[-4,17]],INK,INK,1);
 else if(['INFP','ISFJ','ISFP'].includes(type))line([[-3,14],[0,16],[4,15],[6,13]],1.6);
 else line([[-4,15],[3,15]],1.7);
 // Expand hair and hats around the forehead, without scaling the face or its features.
 // The extra side coverage prevents the angular head outline peeking past the silhouette.
 for(const shape of shapes){
  const isHair=shape.fill===hair,isHat=type==='ISTP'&&(shape.fill===0x59636b||shape.fill===0xbac3cd);
  if(!isHair&&!isHat)continue;
  const sx=isHat?1.12:1.14,sy=1.1,pivot=-8;
  if(shape.kind==='ellipse'){shape.x*=sx;shape.y=pivot+(shape.y-pivot)*sy;shape.w*=sx;shape.h*=sy;}
  else shape.points=shape.points.map(p=>({x:p.x*sx,y:pivot+(p.y-pivot)*sy}));
 }
 cache.set(type,shapes);return shapes;
}
const hex=(n:number)=>'#'+n.toString(16).padStart(6,'0');
export function characterFaceSvg(type:string,x:number,y:number,scale:number){
 return `<g transform="translate(${x} ${y}) scale(${scale})" stroke-linecap="round" stroke-linejoin="round">${characterFace(type).map(s=>{const style=`fill="${s.fill===undefined?'none':hex(s.fill)}" stroke="${s.stroke===undefined?'none':hex(s.stroke)}" stroke-width="${s.width||1}"`;return s.kind==='ellipse'?`<ellipse cx="${s.x}" cy="${s.y}" rx="${s.w/2}" ry="${s.h/2}" ${style}/>`:`<${s.kind==='line'?'polyline':'polygon'} points="${s.points.map(p=>p.x+','+p.y).join(' ')}" ${style}/>`;}).join('')}</g>`;
}

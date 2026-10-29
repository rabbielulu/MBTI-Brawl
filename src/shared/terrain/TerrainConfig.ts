export type TerrainProfile='Open'|'Normal'|'Maze'|'Muddy'|'Toxic'|'Chaos';
export type SizeType='Small'|'Medium'|'Large';
export const TERRAIN_CONFIG={bounds:{left:70,right:1330,top:85,bottom:875},spawnSafeRadius:105,minObstacleDistance:48,maxOverlapRatio:.3,maxHazardBudget:30,maxPlacementAttempts:20,mudSpeed:.6,toxicDps:.05,coverBasicDamage:10,coverHp:{Small:20,Medium:30,Large:50},obstacleBase:{w:76,h:50},scales:{Small:1,Medium:1.5,Large:2},areaFraction:{Small:.04,Medium:.075,Large:.12},costs:{obstacle:{Small:2,Medium:3,Large:5},mud:{Small:4,Medium:6,Large:9},toxic:{Small:6,Medium:9,Large:12}}};
export const TERRAIN_PROFILES:Record<TerrainProfile,{probability:number;obstacle:[number,number];mud:[number,number];toxic:[number,number]}>= {
 Open:{probability:10,obstacle:[0,1],mud:[0,0],toxic:[0,0]},Normal:{probability:30,obstacle:[2,3],mud:[0,1],toxic:[0,1]},Maze:{probability:15,obstacle:[4,5],mud:[0,1],toxic:[0,0]},Muddy:{probability:15,obstacle:[1,3],mud:[1,2],toxic:[0,0]},Toxic:{probability:15,obstacle:[1,3],mud:[0,0],toxic:[1,2]},Chaos:{probability:15,obstacle:[2,5],mud:[1,2],toxic:[1,2]}
};
/** Skins carry no mechanics. Default is descriptive; themed labels are opt-in. */
export const ENVIRONMENT_SKINS={obstacle:['障碍物','成年人的责任','Deadline','KPI'],mud:['泥潭','周一','社交场合','加班','已读不回'],toxic:['有毒区域','无效会议','被迫团建','甲方修改意见']};

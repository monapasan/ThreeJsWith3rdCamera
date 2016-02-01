const T = require('three');
var Stats = require('fps-component');
var dat = require('dat-gui');
require('three-first-person-controls')(T);
require('three-obj-loader')(T);;
var OrbitControls = require('three-orbit-controls')(T)
var ObjMtlLoader = require("./OBJMTLLoader");
var objMtlLoader = new ObjMtlLoader();
var stats, gui;

var camera, scene, renderer, manager;
var geometry, material, mesh;
var directionalLight;
var pointLight, light;

var raycaster = new T.Raycaster();
var mouseDelta = {};
var lastX, lastY;
var currentlyPressedKeys = {};
// Semi-constants
const WIDTH = window.innerWidth,
	HEIGHT = window.innerHeight,
	ASPECT = WIDTH / HEIGHT,
	UNITSIZE = 250,
	WALLHEIGHT = UNITSIZE / 3,
	MOVESPEED = 200,
	LOOKSPEED = 2,
	BULLETMOVESPEED = MOVESPEED * 5,
	NUMAI = 5,
	PROJECTILEDAMAGE = 20;
// Global vars
var controls, clock, projector, model, skin, eve;
var runAnim = true, mouse = { x: 0, y: 0 }, kills = 0, health = 100;
var healthCube, lastHealthPickup = 0;

var map = [ // 1  2  3  4  5  6  7  8  9
           [1, 1, 1, 1, 1, 1, 1, 1, 1, 1,], // 0
           [1, 1, 0, 0, 0, 0, 0, 1, 1, 1,], // 1
		   [1, 1, 0, 0, 2, 0, 0, 0, 0, 1,], // 2
		   [1, 1, 0, 0, 2, 0, 0, 0, 0, 1,], // 2
		   [1, 1, 0, 0, 2, 0, 0, 0, 0, 1,], // 2
		   [1, 1, 0, 0, 2, 0, 0, 0, 0, 1,], // 2
           [1, 1, 0, 0, 2, 0, 0, 0, 0, 1,], // 2
           [1, 0, 0, 0, 0, 2, 0, 0, 0, 1,], // 3
           [1, 0, 0, 2, 0, 0, 2, 0, 0, 1,], // 4
           [1, 0, 0, 0, 2, 0, 0, 0, 1, 1,], // 5
           [1, 1, 1, 0, 0, 0, 0, 1, 1, 1,], // 6
           [1, 1, 1, 0, 0, 1, 0, 0, 1, 1,], // 7
           [1, 1, 1, 1, 1, 1, 0, 0, 1, 1,], // 8
           [1, 1, 1, 1, 1, 1, 1, 1, 1, 1,], // 9
           ], mapW = map.length, mapH = map[0].length;

function onError(err){
    console.log(err);
}
function onDocumentMouseMove(e) {
	e.preventDefault();
	mouse.x = (e.clientX / WIDTH) * 2 - 1;
	mouse.y = - (e.clientY / HEIGHT) * 2 + 1;
}
// function onKeyDown ( event ) {
//     currentlyPressedKeys[event.keyCode] = true;
//     if (event.keyCode==32) jump.isPerforming = true;
//     var rotateAngle = 0.05;
//     switch( event.keyCode ) {
//         case 68: /*D*/
//             eve.rotateY(rotateAngle)
//             break;
//
//         case 65: /*A*/
//             eve.rotateY(-rotateAngle)
//             break;
//     }
// };
function onKeyDown(event) {
    currentlyPressedKeys[String.fromCharCode(event.keyCode)] = true;
    if (event.keyCode==32) jump.isPerforming = true;
}


function onKeyUp(event) {
    currentlyPressedKeys[String.fromCharCode(event.keyCode)] = false;
}

function setLight(){
    directionalLight = new T.DirectionalLight( 0xffffff);
    directionalLight.position.set( 0, 300, 300 );
    directionalLight.lookAt(new T.Vector3(0, 0, 0));
    directionalLight.castShadow = true;
    directionalLight.shadowDarkness = 0.5;
    directionalLight.shadowCameraVisible = true;
    scene.add(directionalLight);

    var directionalLightHelper = new T.DirectionalLightHelper(directionalLight, 10);
    scene.add(directionalLightHelper);

    pointLight = new T.PointLight( 0xffffff, 1, 1000 );
    scene.add( pointLight );

    var sphereSize = 1;
    var pointLightHelper = new T.PointLightHelper(pointLight, sphereSize );
    scene.add( pointLightHelper );
}

function onProgress(xhr){
    if(xhr.lengthComputable){
        var percentComplete = xhr.loaded / xhr.total * 100;
        console.log( Math.round(percentComplete, 2) + '% downloaded' );
    }
}
function getMapSector(v) {
	var x = Math.floor((v.x + UNITSIZE / 2) / UNITSIZE + mapW/2);
	var z = Math.floor((v.z + UNITSIZE / 2) / UNITSIZE + mapW/2);
	return {x: x, z: z};
}



function checkWallCollision(v) {
	var c = getMapSector(v);
	return map[c.x][c.z] > 0;
}

function loadObject(){
    var loader = new T.OBJLoader(manager);
    // objMtlLoader.load(
    // 	// OBJ resource URL
    // 	'resources/Wall-e.obj',
    // 	// MTL resource URL
    // 	'resources/Wall-e.mtl',
    // 	// Function when both resources are loaded
    // 	function ( object ) {
    //         console.log(object);
    //         eve = object;
    //         eve.add(camera);
    //         // scene.add(object);
    // 		// scene.add( object );
    // 	}, onProgress, onError);
    var i = true;
    var aiMaterial = new T.MeshBasicMaterial({map: T.ImageUtils.loadTexture('resources/eye.png', T.SphericalReflectionMapping)});
    loader.load('resources/Eve.obj',(obj)=>{
      obj.traverse((child)=>{
          if( child instanceof T.Mesh){
              child.material = new T.MeshPhongMaterial( { color: '#ede5e5', wireframe: false, shading:T.FlatShading,shininess:30});
              var labmer = new T.MeshLambertMaterial(
                {
                  color: '#e2edda',
                  wireframe: true
                });
				// child.material = labmer;
          }
      });
      obj.scale.set(0.15,0.15,0.15);
      obj.position.y = 30;
      obj.rotateY(180);
      eve = obj;
      eve.add(camera);
      scene.add(obj);
    }, onProgress, onError);
}

function init () {
    camera = new T.PerspectiveCamera( 60, ASPECT, 1, 100000 );
    camera.position.y = UNITSIZE * 2;
    camera.position.x = UNITSIZE * 2;
    camera.position.z = UNITSIZE * 5;
    clock = new T.Clock();
    scene = new T.Scene();
    // color and density in params
    scene.fog = new T.FogExp2(0xD6F1FF, 0.000001);
    // scene.add(camera);

    // controls wasd


    renderer = new T.WebGLRenderer();

    setupScene();
    manager = new T.LoadingManager();
    manager.onProgress = function ( item, loaded, total ) {
        console.log( item, loaded, total );
    };
    document.addEventListener('mousemove', onDocumentMouseMove, false);
    document.addEventListener('keydown', onKeyDown, false);
    document.addEventListener('keyup', onKeyUp, false);
	document.addEventListener('click', createBullet, false);

    loadObject();

    renderer.setSize(WIDTH, HEIGHT);
    renderer.setClearColor("#eaebf4" );
    renderer.render( scene, camera );

    var size = 1000;
    var step = 100;

    var gridHelper = new T.GridHelper( size, step );
    scene.add( gridHelper );

    document.body.appendChild( renderer.domElement );

    stats = new Stats();
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.left = '0px';
    stats.domElement.style.top = '0px';
    document.body.appendChild(stats.domElement);

}
var bullets = [];
var sphereMaterial = new T.MeshLambertMaterial({color: '#0e9de3'});
var sphereGeo = new T.SphereGeometry(10, 10, 10);

function createBullet(obj) {
	obj = eve;
	var sphere = new T.Mesh(sphereGeo, sphereMaterial);
	sphere.position.set(obj.position.x, obj.position.y * 0.8, obj.position.z);
	var raycaster = new T.Raycaster();
	// if (obj instanceof T.Camera) {
		var vector = new T.Vector3(mouse.x, mouse.y, 1);
		raycaster.setFromCamera( mouse, camera );

		// projector.unprojectVector(vector, obj);
		// sphere.ray = new t.Ray(
		// 		obj.position,
		// 		vector.subSelf(obj.position).normalize()
		// );
		sphere.ray = raycaster.ray;
	// }
	sphere.owner = obj;

	bullets.push(sphere);
	scene.add(sphere);

	return sphere;
}

function setupScene() {
	var units = mapW;

	// Geometry: floor
	var floor = new T.Mesh(
			new T.BoxGeometry(units * UNITSIZE, 10, units * UNITSIZE),
			new T.MeshLambertMaterial({map: T.ImageUtils.loadTexture('resources/Texture/mudde.jpg')})
	);
	scene.add(floor);

	// Geometry: walls
	var cube = new T.BoxGeometry(UNITSIZE, WALLHEIGHT, UNITSIZE);
	var materials = [
	                 new T.MeshLambertMaterial({map: T.ImageUtils.loadTexture('resources/wall-4.jpg')}),
	                 new T.MeshLambertMaterial({map: T.ImageUtils.loadTexture('resources/wall-5.jpg')}),
	                 ];
	for (var i = 0; i < mapW; i++) {
		for (var j = 0, m = map[i].length; j < m; j++) {
			if (map[i][j]) {
				var wall = new T.Mesh(cube, materials[map[i][j]-1]);
				wall.position.x = (i - units/2) * UNITSIZE;
				wall.position.y = WALLHEIGHT/2;
				wall.position.z = (j - units/2) * UNITSIZE;
				scene.add(wall);
			}
		}
	}

	// // Health cube
	// healthcube = new T.Mesh(
	// 		new T.BoxGeometry(30, 30, 30),
	// 		new T.MeshBasicMaterial({map: T.ImageUtils.loadTexture('images/health.png')})
	// );
	// healthcube.position.set(-UNITSIZE-15, 35, -UNITSIZE-15);
	// scene.add(healthcube);

	// Lighting
	var directionalLight1 = new T.DirectionalLight( 0xF7EFBE, 0.7 );
	directionalLight1.position.set( 0.5, 1, 0.5 );
	scene.add( directionalLight1 );
	var directionalLight2 = new T.DirectionalLight( 0xF7EFBE, 0.5 );
	directionalLight2.position.set( -0.5, -1, -0.5 );
	scene.add( directionalLight2 );
}
function proceedInteraction(delta){
    var moveDistance = MOVESPEED * delta; // 200 pixels per second
    var rotateAngle = Math.PI / LOOKSPEED * delta;
    if ( currentlyPressedKeys["W"] ){
		eve.translateZ( -moveDistance );
		if (checkWallCollision(eve.position)) {
			eve.translateZ(moveDistance);
		}
    }
	if ( currentlyPressedKeys["S"] ){
		eve.translateZ(moveDistance );
        if (checkWallCollision(eve.position)) {
            eve.translateZ(-moveDistance);
        }
    }
	if ( currentlyPressedKeys["Q"] ){
		eve.translateX( -moveDistance );
        if (checkWallCollision(eve.position)) {
            eve.translateX(moveDistance);
        }
    }
	if ( currentlyPressedKeys["E"] ){
		eve.translateX(moveDistance );
        if (checkWallCollision(eve.position)) {
            eve.translateX(-moveDistance);
        }
    }
	// rotate left/right/up/down
	if ( currentlyPressedKeys["A"] )
		eve.rotateOnAxis( new T.Vector3(0,1,0), rotateAngle);
	if ( currentlyPressedKeys["D"] )
		eve.rotateOnAxis( new T.Vector3(0,1,0), -rotateAngle);
	if ( currentlyPressedKeys["R"] )
		eve.rotateOnAxis( new T.Vector3(1,0,0), rotateAngle);
	if ( currentlyPressedKeys["F"] )
		eve.rotateOnAxis( new T.Vector3(1,0,0), -rotateAngle);

    // var relativeCameraOffset = new T.Vector3(0,50, MOVESPEED);
    //
	// var cameraOffset = relativeCameraOffset.applyMatrix4( eve.matrixWorld );

    camera.lookAt( eve.position );
}

function draw(){

    if(!eve){
        return;
    }
	var delta = clock.getDelta();
	var speed = delta * BULLETMOVESPEED;
	for (var i = bullets.length-1; i >= 0; i--) {
		var b = bullets[i], p = b.position, d = b.ray.direction;
		if (checkWallCollision(p)) {
			bullets.splice(i, 1);
			scene.remove(b);
			continue;
		}
		b.translateX(speed * d.x);
		//bullets[i].translateY(speed * bullets[i].direction.y);
		b.translateZ(speed * d.z);
	}
    proceedInteraction(delta);
    // camera.position.x = eve.position.x + UNITSIZE * mouse.x;
    // camera.position.z = eve.position.z + UNITSIZE * mouse.y;

    renderer.render(scene, camera);
}

function loop () {
    requestAnimationFrame( loop );
    stats.begin()

    var time = +new Date() * 0.001;
    draw();
    stats.end();
}

require('domready')(() => {
    init();
    loop();
});

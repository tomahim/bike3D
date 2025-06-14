import * as THREE from 'three';
import * as dat from 'dat.gui';
import { addGuiObjectInFolder } from './gui.helpers.js';

const loader = new THREE.TextureLoader();

const groundmaps = {
  grass: loader.load('static/grounds/grass.jpg'),
  toon: loader.load('static/grounds/toon.jpg'),
  dirt: loader.load('static/grounds/dirt.jpg'),
};
const heightmaps = {
  vulcano: loader.load('static/heightmaps/vulcano.jpg'),
  spirals: loader.load('static/heightmaps/spirals.png'),
  fracture: loader.load('static/heightmaps/fracture.jpg'),
  mountains: loader.load('static/heightmaps/mountains.png'),
};

const gui = new dat.GUI();

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x7ec8e3);

const geometry = new THREE.PlaneGeometry(10, 10, 64, 64);
const material = new THREE.MeshStandardMaterial({
  color: 'white',
  map: groundmaps['grass'],
  displacementMap: heightmaps['vulcano'],
});

const plane = new THREE.Mesh(geometry, material);

plane.rotation.x = 181;
scene.add(plane);

// camera
const camera = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  2,
  10
);
camera.position.x = 0;
camera.position.z = 9;

// light
const light = new THREE.PointLight(0xffffff, 2);
light.position.x = 2;
light.position.y = 3;
light.position.z = 4;
light.intensity = 10.5;
const lightProps = { color: '#fff' };

// gui

addGuiObjectInFolder(gui, 'plane', plane, [
  'position.x', 
  'position.y', 
  'position.z',
  'rotation.x',
  'rotation.y',
  'rotation.z',
]);
addGuiObjectInFolder(gui, 'camera', camera, [
  'position.x',
  'position.y',
  'position.z',
  'rotation.x',
  'rotation.y',
  'rotation.z',
  'zoom',
  'near',
  'far',
]);
const lightFolder = addGuiObjectInFolder(gui, 'light', light, [
  'position.x',
  'position.y',
  'position.z',
  'intensity',
  'distance',
  'decay',
]);
lightFolder.addColor(lightProps, 'color').onChange(() => {
  light.color.set(lightProps.color);
});

const textureOptions = {
  map: groundmaps['grass'],
  displacementMap: heightmaps['vulcano'],
};

gui.add(textureOptions, 'map', Object.keys(groundmaps)).onChange(value => {
  plane.material.map = groundmaps[value];
});

gui
  .add(textureOptions, 'displacementMap', Object.keys(heightmaps))
  .onChange(value => {
    plane.material.displacementMap = heightmaps[value];
  });
gui.add(material, 'displacementScale');
gui.add(material, 'displacementBias');

scene.add(light);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setAnimationLoop(animation);
document.body.appendChild(renderer.domElement);

// animation
function animation(time) {
  // mesh.rotation.x = time / 5;
  // mesh.rotation.y = time / 1000;

  renderer.render(scene, camera);
}

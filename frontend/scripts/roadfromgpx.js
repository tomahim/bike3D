import * as THREE from 'three';
import * as dat from 'dat.gui';
import { addGuiObjectInFolder } from './gui.helpers.js';
import { parseGPX } from "@we-gold/gpxjs";


async function getFileContent() {
    try {
        const response = await fetch('static/gpx/sample.gpx');
        if (!response.ok) {
        throw new Error('Network response was not ok');
        }
        const content = await response.text();
        return content;
    } catch (error) {
        console.error('Error fetching the file:', error);
    }
}


const gpxContent = await getFileContent();

const [parsedFile, error] = parseGPX(gpxContent);

const geojson = parsedFile.toGeoJSON();

console.log({parsedFile, error, geojson});

// const loader = new THREE.TextureLoader();

const gui = new dat.GUI();

// const scene = new THREE.Scene();
// scene.background = new THREE.Color(0x7ec8e3);

// const geometry = new THREE.PlaneGeometry(30, 30, 64, 64);
// const material = new THREE.MeshStandardMaterial({
//   color: 'white',
//   map: loader.load('static/grounds/road.jpg'),
// });

// const plane = new THREE.Mesh(geometry, material);

// plane.rotation.x = 181;
// scene.add(plane);

// // camera
// const camera = new THREE.PerspectiveCamera(
//   70,
//   window.innerWidth / window.innerHeight,
//   0.01,
//   1000
// );
// camera.position.x = 0;
// camera.position.z = 24;

// // light
// const light = new THREE.PointLight(0xffffff, 2);
// light.position.x = 2;
// light.position.y = 19;
// light.position.z = 4;
// light.intensity = 180;
// light.decay = 1.4;
// const lightProps = { color: '#fff' };

// // gui

// addGuiObjectInFolder(gui, 'plane', plane, [
//   'position.x', 
//   'position.y', 
//   'position.z',
//   'rotation.x',
//   'rotation.y',
//   'rotation.z',
// ]);
// const lightFolder = addGuiObjectInFolder(gui, 'light', light, [
//   'position.x',
//   'position.y',
//   'position.z',
//   'intensity',
//   'distance',
//   'decay',
// ]);
// lightFolder.addColor(lightProps, 'color').onChange(() => {
//   light.color.set(lightProps.color);
// });

// scene.add(light);

// const renderer = new THREE.WebGLRenderer({ antialias: true });
// renderer.setSize(window.innerWidth, window.innerHeight);
// renderer.setAnimationLoop(animation);
// document.body.appendChild(renderer.domElement);

// // animation
// function animation(time) {
//   // mesh.rotation.x = time / 5;
//   // mesh.rotation.y = time / 1000;

//   renderer.render(scene, camera);
// }




export class RoadGenerator {
    constructor(scene) {
      this.scene = scene;
      this.roadPath = null;
      this.roadMesh = null;
      this.pathPoints = [];
    }
  
    // Convert lat/lng to world coordinates
    latLngToWorld(lat, lng, centerLat, centerLng, scale = 1000) {
      const x = (lng - centerLng) * scale * Math.cos(centerLat * Math.PI / 180);
      const z = (centerLat - lat) * scale;
      return new THREE.Vector3(x, 0, z);
    }
  
    // Generate road from GPS coordinates
    generateRoad(coordinates, options = {}) {
      const {
        roadWidth,
        roadHeight,
        scale,
        smoothness
      } = options;
  
      if (coordinates.length < 2) {
        console.error('Need at least 2 coordinates');
        return;
      }
  
      // Find center point for coordinate conversion
      const centerLat = coordinates.reduce((sum, coord) => sum + coord.lat, 0) / coordinates.length;
      const centerLng = coordinates.reduce((sum, coord) => sum + coord.lng, 0) / coordinates.length;
  
      // Convert GPS coordinates to 3D points
      this.pathPoints = coordinates.map(coord => 
        this.latLngToWorld(coord.lat, coord.lng, centerLat, centerLng, scale)
      );

      // Filter out points that are too close together
      this.pathPoints = this.filterClosePoints(this.pathPoints, 70);
  
      // Create smooth curve
      this.roadPath = new THREE.CatmullRomCurve3(this.pathPoints);
      this.roadPath.tension = smoothness;
      this.roadPath.curveType = 'catmullrom'; 
  
      // Generate road geometry
      this.createRoadGeometry(roadWidth, roadHeight);
      
      return this.roadPath;
    }


    // Filter out points that are too close
    filterClosePoints(points, minDistance) {
        if (points.length <= 2) return points;
        
        const filtered = [points[0]]; // Always keep first point
        
        for (let i = 1; i < points.length - 1; i++) {
        const lastKept = filtered[filtered.length - 1];
        const current = points[i];
        
        if (lastKept.distanceTo(current) >= minDistance) {
            filtered.push(current);
        }
        }
        
        // Always keep last point
        filtered.push(points[points.length - 1]);
        
        return filtered;
    }
  
    createRoadGeometry(width, height) {
        // Au lieu d'utiliser ExtrudeGeometry, créons une géométrie plate
        const points = this.roadPath.getPoints(this.pathPoints.length * 20);
        
        const vertices = [];
        const indices = [];
        const uvs = [];
      
        for (let i = 0; i < points.length - 1; i++) {
          const point1 = points[i];
          const point2 = points[i + 1];
          
          // Calculer la direction perpendiculaire pour la largeur de la route
          const direction = new THREE.Vector3().subVectors(point2, point1).normalize();
          const perpendicular = new THREE.Vector3(-direction.z, 0, direction.x).normalize();
          
          // Créer les 4 coins du segment de route
          const left1 = point1.clone().add(perpendicular.clone().multiplyScalar(width / 2));
          const right1 = point1.clone().add(perpendicular.clone().multiplyScalar(-width / 2));
          const left2 = point2.clone().add(perpendicular.clone().multiplyScalar(width / 2));
          const right2 = point2.clone().add(perpendicular.clone().multiplyScalar(-width / 2));
          
          // Ajouter une petite hauteur pour que la route soit visible
          left1.y += height;
          right1.y += height;
          left2.y += height;
          right2.y += height;
          
          // Ajouter les vertices
          const baseIndex = vertices.length / 3;
          vertices.push(
            left1.x, left1.y, left1.z,
            right1.x, right1.y, right1.z,
            left2.x, left2.y, left2.z,
            right2.x, right2.y, right2.z
          );
          
          // Créer les triangles (face vers le haut)
          indices.push(
            baseIndex, baseIndex + 2, baseIndex + 1,
            baseIndex + 1, baseIndex + 2, baseIndex + 3
          );
          
          // UVs pour la texture
          const u = i / (points.length - 1);
          uvs.push(0, u, 1, u, 0, u + 0.1, 1, u + 0.1);
        }
      
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setIndex(indices);
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geometry.computeVertexNormals();
      
        // Matériau de la route
        const material = new THREE.MeshLambertMaterial({ 
          color: 0x333333,
          side: THREE.DoubleSide,
        });
      
        // Supprimer l'ancienne route si elle existe
        if (this.roadMesh) {
          this.scene.remove(this.roadMesh);
        }
      
        this.roadMesh = new THREE.Mesh(geometry, material);
        this.scene.add(this.roadMesh);
      
        // Ajouter les marquages de route
        this.addRoadMarkings(width);
    }
  
    addRoadMarkings(roadWidth) {
      const points = this.roadPath.getPoints(this.pathPoints.length * 20);
      const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
      
      // Offset points to road surface
      const positions = lineGeometry.attributes.position.array;
      for (let i = 1; i < positions.length; i += 3) {
        positions[i] += 0.6; // Slightly above road surface
      }
  
      const lineMaterial = new THREE.LineBasicMaterial({ 
        color: 0xffffff,
        linewidth: 2
      });
  
      const centerLine = new THREE.Line(lineGeometry, lineMaterial);
      this.scene.add(centerLine);
    }
  
    // Get position and rotation for bike at given progress (0-1)
    getBikeTransform(progress) {
      if (!this.roadPath) return null;
  
      const position = this.roadPath.getPoint(progress);
      const tangent = this.roadPath.getTangent(progress);
      
      // Calculate rotation from tangent
      const angle = Math.atan2(tangent.x, tangent.z);
      
      return {
        position: new THREE.Vector3(position.x, position.y + 1, position.z),
        rotation: new THREE.Euler(0, angle, 0)
      };
    }
  }
  
  export class BikeController {
      constructor(bike, roadGenerator) {
        this.bike = bike;
        this.roadGenerator = roadGenerator;
        this.progress = 0;
        this.speed = 0.0002; // Adjust speed as needed
        this.isMoving = false;
      }
    
      startMoving() {
        this.isMoving = true;
      }
    
      stopMoving() {
        this.isMoving = false;
      }
    
      update() {
        if (!this.isMoving || !this.roadGenerator.roadPath) return;
    
        this.progress += this.speed;
        if (this.progress > 1) this.progress = 0; // Loop back to start
    
        const transform = this.roadGenerator.getBikeTransform(this.progress);
        if (transform) {
          this.bike.position.copy(transform.position);
          this.bike.rotation.copy(transform.rotation);
        }
      }
    
      setSpeed(speed) {
        this.speed = speed;
      }
    
      setProgress(progress) {
        this.progress = Math.max(0, Math.min(1, progress));
      }
    }

// Initialize

// Make sure these are defined before using RoadGenerator
// Your GPS coordinates

const gpsCoordinates = parsedFile.tracks[0].points.map(point => ({
    lat: point.latitude,
    lng: point.longitude
}));

// const gpsCoordinates = [
//     { lat: 40.7128, lng: -74.0060 },
//     { lat: 40.7130, lng: -74.0058 },
//     { lat: 40.7135, lng: -74.0055 },
//     { lat: 40.7140, lng: -74.0050 }
//   ];
  
  // Basic Three.js setup
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x7ec8e3);
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);


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
  'fov',
  'aspect'
]);

  const renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);
  
  // Add some lighting
  const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
  scene.add(ambientLight);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(10, 10, 5);
  scene.add(directionalLight);
  
  // Create a simple bike model (replace with your actual bike)
  const bikeGeometry = new THREE.BoxGeometry(2, 1, 4);
  const bikeMaterial = new THREE.MeshLambertMaterial({ color: 0xff0000 });
  const bikeModel = new THREE.Mesh(bikeGeometry, bikeMaterial);
  scene.add(bikeModel);
  
  // Generate road
  const roadGenerator = new RoadGenerator(scene);
  const roadPath = roadGenerator.generateRoad(gpsCoordinates, {
    roadWidth: 10,
    roadHeight: 0.3,
    scale: 100000,
    smoothness: 0.1
  });
  
  // Setup bike controller
  const bikeController = new BikeController(bikeModel, roadGenerator);
  bikeController.startMoving();
  
  // Position camera to see the road
//   camera.position.set(0, 50, 50);
//   camera.lookAt(0, 0, 0);
  
  // Animation loop
  function animate() {
    bikeController.update();
    
    const bikePos = bikeModel.position;
    const bikeRot = bikeModel.rotation;
    
    // Option 1: Directement derrière (vue de poursuite)
    const distance = 15;
    const height = 9;
    const behindOffset = new THREE.Vector3(0, 0, -distance);
    behindOffset.applyEuler(bikeRot);
    
    camera.position.set(
      bikePos.x + behindOffset.x,
      bikePos.y + height,
      bikePos.z + behindOffset.z
    );
    camera.lookAt(bikePos);
    
    // Option 2: Vue première personne (sur le vélo)
    // const fpOffset = new THREE.Vector3(0, 2, 0);
    // fpOffset.applyEuler(bikeRot);
    // camera.position.set(
    //   bikePos.x + fpOffset.x,
    //   bikePos.y + fpOffset.y,
    //   bikePos.z + fpOffset.z
    // );
    // const lookAhead = new THREE.Vector3(0, 0, -10);
    // lookAhead.applyEuler(bikeRot);
    // camera.lookAt(
    //   bikePos.x + lookAhead.x,
    //   bikePos.y + lookAhead.y,
    //   bikePos.z + lookAhead.z
    // );
    
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }
  
  animate(); 



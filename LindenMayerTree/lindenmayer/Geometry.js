/*
*  TP 3 IFT 3355
*  Jean-Marc Prud'homme (20137035)
*  Jean-Daniel Toupin
*
* */

/**
 * Node Constructor
 */
class Node {
	constructor (parentNode) {
		this.parentNode = parentNode; //Noeud parent
		this.childNode = []; //Noeud enfants
		this.matrix = idMat4(); // Matrix for creating tree
		this.movingFrame = idMat4(); // Matrix to move polygons around

		this.p0 = null; //Position de depart de la branche
		this.p1 = null; //Position finale de la branche
		this.a0 = null; //Rayon de la branche a p0
		this.a1 = null; //Rayon de la branche a p1

		this.pointBezier = [];   // les points besiers a dessiner
		this.pointTan = [];      // les tangente au point de bezier
		this.sections = []; //Liste contenant une liste de points representant les segments circulaires du cylindre generalise


	}
}


TP3.Geometry = {


	/**
	 * Generate Skeleton from a lindenmayer grammar
	 * @param str the string generated from grammar
	 * @param theta	the angle between rotations
	 * @param alpha	length of segments
	 * @param decay decay of width
	 * @returns {Node}
	 */
	generateSkeleton: function (str, theta, alpha, decay) {


		// Creation of root
		let root = new Node();
		root.p0 = new THREE.Vector3(0,0,0);
		root.p1 = new THREE.Vector3(0,alpha,0);
		root.a0 = alpha;
		root.a1 = alpha * decay;

		// Stack, placeholder, Base Matrix
		let stack = [];
		let currentNode = root;
		let matrix =  idMat4();

		// ITERATION OF Str
		for (let i = 0; i < str.length; i++) {
			let char = str.charAt(i);



			// ALPHABET CASES
			switch (true) {

				// CASE CHAR
				case char >= "A" && char <= "Z":

					//creation child
					let child = new Node(currentNode);
					child.a0 = currentNode.a1 ;
					child.a1 = currentNode.a1 * decay;
					child.p0 = currentNode.p1.clone();
					child.matrix = matrix.clone();

					// Creation p1
					let vect = new THREE.Vector3(0,alpha,0);
					vect.applyMatrix4(matrix.clone())
					child.p1 = child.p0.clone().add(vect.clone());

					//Change placeholder
					currentNode.childNode.push(child);
					currentNode = child;
					break;

				// STACK
				case char === "[":

					let stackNode = {
						"mat": matrix.clone(),
						"node": currentNode,
					};
					stack.push(stackNode);
					break;

				// UNSTACK
				case char === "]":

					let stackObj = stack.pop();
					currentNode = stackObj.node;
					matrix = stackObj.mat.clone();
					break;

				// ROTATION + X
				case char === "+":
					matrix = multMat(matrix, idMat4().makeRotationX(theta)).clone();
					//matrix = rotateMat(matrix, theta, "x")
					break;

				// ROTATION - X
				case char === "-":
					matrix = multMat(matrix, idMat4().makeRotationX(-theta)).clone();
					break;

				// ROTATION + Y
				case char === "/":
					matrix = multMat(matrix, idMat4().makeRotationY(theta)).clone();
					break;

				// ROTATION - Y
				case char === "\\":
					matrix = multMat(matrix, idMat4().makeRotationY(-theta)).clone();
					break;

				// ROTATION + Z
				case char === "^":
					matrix = multMat(matrix, idMat4().makeRotationZ(theta)).clone();
					break;

				// ROTATION - Z
				case char === "_":
					matrix = multMat(matrix, idMat4().makeRotationZ(-theta)).clone();
					break;

				default:
					console.log("aucune expression")

			}
		}
		this.simplifySkeleton(root);
		return root;
	},

	/**
	 * Remove unnecessary nodes from skeleton
	 * @param rootNode
	 * @param rotationThreshold
	 */
	simplifySkeleton: function (rootNode, rotationThreshold = 0.0001) {

		let stack = [];
		stack.push(rootNode);
		while (stack.length > 0) {

			let node = stack.pop();
			for (let i=0; i<node.childNode.length; i++) {
				stack.push(node.childNode[i]);
			}

			// skip root and leaves
			if (!(node.parentNode === undefined) && node.childNode.length !== 0) {

				// Calculate directional Vects and their angles
				let v1 = node.parentNode.p1.clone().sub(node.parentNode.p0.clone());
				let v2 = node.p1.clone().sub(node.p0.clone());
				let angle = v1.clone().angleTo(v2.clone());

				// If angle to big we merge nodes
				if (angle <= rotationThreshold){
					node.parentNode.p1 = node.childNode[0].p0;
					node.parentNode.a1 = node.a1;
					node.parentNode.childNode = node.childNode;

					for (let i = 0; i < node.childNode.length; i++) {
						node.childNode[i].parentNode = node.parentNode;
						node.childNode[i].a0 = node.parentNode.a1;
					}
				}
			}
		}
	},

	/**
	 * Generate hermite segments to smooth the tree out
	 * @param rootNode
	 * @param lengthDivisions  number of points between nodes
	 * @param radialDivisions  # of sides for polygon for branches
	 */
	generateSegmentsHermite: function (rootNode, lengthDivisions = 4, radialDivisions = 10) {

		let stack = [];
		stack.push(rootNode);

		while (stack.length > 0) {

			let node = stack.pop();
			for (let i = 0; i < node.childNode.length ; i++) {
					stack.push(node.childNode[i]);
				}

				// gerenate intial points and tangents
		      	let points = this.hermitePoints(node,lengthDivisions);
				node.pointBezier = points[0];
				node.pointTan = points[1];
		}

		// After first iteration of each nodes to calculate t points
		// we do second iteration to make all the pentagons
		this.createBranches(rootNode, radialDivisions);
	},


	/**
	 *
	 * @param rootNode
	 * @param radialDivisions
	 */
	createBranches: function(rootNode, radialDivisions){

	let stack = [];
	stack.push(rootNode);

	while (stack.length > 0) {

		let node = stack.pop();
		for (let i = 0; i < node.childNode.length; i++) {
			stack.push(node.childNode[i]);
		}

		let movingFrame = idMat4();

		for (let i = 0; i < node.pointBezier.length; i++) {

			let deltaWidth = node.a0 - node.a1;	//Difference between begining and end
			let radius = node.a0 - deltaWidth * i / (node.pointBezier.length - 1); //interpolation of diff
			let radiusVector = new THREE.Vector3(radius, 0, 0); // create vector
			let points = [];


			switch (true) {
				case node.parentNode === undefined:  // if parent we keep idmat4()
					break;

				case i === 0: // else take parent moving frame
					movingFrame = node.parentNode.movingFrame;
					break;

				case i !== 0: // else calculate rotation
					let rotationAxis = this.findRotation(node.pointTan[i - 1].clone(), node.pointTan[i].clone());
					movingFrame = multMat(movingFrame, idMat4().makeRotationAxis(rotationAxis[0], rotationAxis[1]));
			}


			//create branches
			for (let j = 0; j < radialDivisions; j++) {

				switch (true) {

					case i === 0 && node.parentNode !==  undefined:   //take last pentagon from parentNode
						points.push(node.parentNode.sections[node.parentNode.sections.length - 1][j]);
						break;

					default:  // else create pentagon from scratch
						let matrix = idMat4().makeRotationY(j * (2 * Math.PI / radialDivisions));
						let branchPoint = radiusVector.clone().applyMatrix4(matrix.clone());

						branchPoint.applyMatrix4(movingFrame.clone());
						branchPoint.applyMatrix4(idMat4().makeTranslation(node.pointBezier[i].x, node.pointBezier[i].y, node.pointBezier[i].z));
						points.push(branchPoint.clone());
				}
			}
			node.sections.push(points);
		}
		node.movingFrame = movingFrame;
		}
	},

	/**
	 * Create mesh from pentagons by making triangles between  points
	 * @param rootNode
	 */
	createCylindre: function (rootNode){

		let customVerticesArray32 = []; // final vertices array
		const indexList = []; //Correspondance between pointsList with indices
		const customVertices = []; //Vertices
		const customIdx = []; //Faces
		let currentIdx = 0;
		let topIndexList = [];  // leaf and base Trunk idx

		let stack = [];
		stack.push(rootNode);

		while (stack.length > 0) {
			let node = stack.pop();
			for (let i = 0; i < node.childNode.length; i++) {
					stack.push(node.childNode[i]);
			}

			let pointsList = node.sections;

			for (let i = 0; i < pointsList.length ; i++) { // liste pentagon

				const subIndexList = [];

				for (let j = 0; j < pointsList[i].length; j++) { // for each point of penta

					// if already exist than add indexes only
					if (customVertices.includes(pointsList[i][j])){
						let index = customVertices.indexOf(pointsList[i][j]);
						subIndexList.push(index);
					} else {  // else add point and indexes

						let point = pointsList[i][j];
						customVertices.push(pointsList[i][j]); // on rajoute sommet pentagon pour search
						customVerticesArray32.push(point.x,point.y,point.z);  // rajoute sommet pour ce faire dessinner

						subIndexList.push(currentIdx);

						// IDX of leafs
						if (i === pointsList.length -1 && node.childNode.length === 0 ){
							topIndexList.push(currentIdx);
						}

						currentIdx++;
					}
				}
				indexList.push(subIndexList);
			}
		}


		for (let i=0; i<indexList.length -1 ; i++) {

			// TEST if LEAF
			if (topIndexList.includes(indexList[i][0])){continue;}

			// create segments
			for (let j=0; j<indexList[i].length ; j++) {

				const topLeft = indexList[i + 1][j];
				const topRight = indexList[i + 1][(j+1)%indexList[i].length];
				const bottomLeft = indexList[i][j];
				const bottomRight = indexList[i][(j+1)%indexList[i].length];

				customIdx.push(topLeft, bottomLeft, bottomRight); //Face 0
				customIdx.push(topLeft, bottomRight, topRight ); //Face 1
			}
		}

		// create closure of trunk and leaves
		for (let i = 0; i < topIndexList.length - 4; i = i + 5) {
			const sommet = topIndexList[i];
			const topL = topIndexList[i + 4];
			const topR = topIndexList[i + 1];
			const bottomR = topIndexList[i + 2];
			const bottomL = topIndexList[i + 3];

			customIdx.push(sommet, topR, bottomR); //Face 0
			customIdx.push(sommet, bottomR, bottomL );//Face 1
			customIdx.push(sommet, bottomL, topL );//Face 2

		}
		// create segments root
		customIdx.push(0, 2, 1); //Face 0
		customIdx.push(0, 3, 2);//Face 1
		customIdx.push(0, 4, 3);//Face 2


		const floatCustomVertices = new Float32Array(customVerticesArray32);
		const customGeometry = new THREE.BufferGeometry(); //Mesh Geometry
		const material = new THREE.MeshLambertMaterial({color: 0x8B5A2B});

		customGeometry.setAttribute('position', new THREE.BufferAttribute(floatCustomVertices, 3));
		customGeometry.setIndex(customIdx); //Set faces
		customGeometry.computeVertexNormals();

		const truncatedCylinderMesh = new THREE.Mesh(customGeometry, material);

		scene.add( truncatedCylinderMesh );
	},


	/**
	 * function that constructs points and tangentes for making hermite/bezier lines
	 * @param node
	 * @param divisions
	 * @returns {[[], []]}  p,dp -> [point, tangent]
	 */
	hermitePoints: function(node, divisions){

		let array = [];
		let v0,v1,h0,h1;

		if (node.parentNode === undefined) { // if Root

			v1 = (node.p1.clone().sub(node.p0.clone()));
			v0 = new THREE.Vector3(0, 1, 0);
			h0 = node.p0.clone();
			h1 = node.p1.clone();

		} else { // if normal node than we calculate average for v1

			v1 = (node.p1.clone().sub(node.p0.clone()));
			v0 = node.parentNode.p1.clone().sub(node.parentNode.p0.clone());
			h0 = node.p0.clone();
			h1 = node.p1.clone();
		}

		//creation des points de bezier
		for (let i = 0; i < divisions; i++) {
			let t = i / (divisions-1) ;
			let p = this.hermite(h0, h1, v0, v1, t);
			array.push(p);

		}

		let p = [];
		let dp = [];
		for (let i = 0; i < array.length; i++) {
			p.push(array[i][0].clone());
			dp.push(array[i][1].clone());
		}
		return [p,dp];
	},

	/**
	 * from hermite to bezier with t factor
	 * @param h0
	 * @param h1
	 * @param v0
	 * @param v1
	 * @param t
	 * @returns {[*, number | string]}
	 */
	hermite: function (h0, h1, v0, v1, t) {

		//Transformation Hermite to Bezier
		let p0 = h0.clone();
		let p1 = h0.clone().add(v0.clone().multiply(new THREE.Vector3(1/3,1/3,1/3)));
		let p2 = h1.clone().sub(v1.clone().multiply(new THREE.Vector3(1/3,1/3,1/3)));
		let p3 = h1.clone();

		let arr = [p0,p1,p2,p3];

		//Create empty table for casteljau iteration values
		let tableau = new Array(4);
		for (let i = 0; i <4; i++) {
			tableau[i] = new Array(4).fill(0);
		}

		//Setting first line of table
		let initTab = function(arr, tab){
			for (let i = 0 ; i< arr.length; i++){
				tab[0][i] = arr[i].clone();
			}
		}
		initTab(arr,tableau);

		//Using dynamic programming ot fill all the values returned by casteljau algorithme
		let casteljau = function(tableau, t){

			let minusTVector = new THREE.Vector3(1-t,1-t,1-t);
			let tVector = new THREE.Vector3(t,t,t);


			for (let i = 1; i < 4; i++) {
				for (let j = 0; j < 4 - i; j++) {

					let point = tableau[i-1][j].clone().multiply(minusTVector.clone()).add(tableau[i-1][j+1].clone().multiply(tVector.clone()));
					tableau[i][j] = point.clone();
				}
			}
		};

		//call DeCasteljau
		casteljau(tableau,t);

		//retourne final point and tangente
		let dp = tableau[2][1].clone().sub(tableau[2][0].clone());
		let p = tableau[3][0].clone();

		return [p,dp];
	},

	/**
	 * Find the rotation between 2 vectors in 3d space
	 * @param a
	 * @param b
	 * @returns {[*, number]}
	 */
	findRotation: function (a, b) {
		const axis = new THREE.Vector3(0,0,0).crossVectors(a, b).normalize();
		let c = a.dot(b)/(a.length() * b.length());

		if (c < -1) {
			c = -1;
		} else if (c > 1) {
			c = 1;
		}

		const angle = Math.acos(c);

		return [axis, angle];
	},

	/**
	 * Get projection of 'a' onto 'b'
	 * @param a vect 'a'
	 * @param b vect 'b'
	 * @returns {*}  projection 'a' onto 'b' -- Vector3
	 */
	project: function (a, b) {
		return b.clone().multiplyScalar(a.dot(b) / (b.lengthSq()));
	},

	/**
	 * Get the mean vector from a list of vectors
	 * @param points
	 * @returns {*}
	 */
	meanPoint: function (points) {
		let mp = new THREE.Vector3(0,0,0);

		for (let i=0; i<points.length; i++) {
			mp.add(points[i]);
		}

		return mp.divideScalar(points.length);
	}
};

/**
 * multiply 2 matrix together
 * @param m1
 * @param m2
 * @returns multiplied matrices
 */
function multMat(m1, m2){
	return idMat4().multiplyMatrices(m1, m2);
}

/**
 * matrix inversion
 * @param m
 * @returns inverted matrix
 */
function inverseMat(m){
	return idMat4().getInverse(m, true);
}

/**
 * Identity matrix
 * @returns matrix of identity 4
 */
function idMat4(){

	return new THREE.Matrix4().set(1,0,0,0,
		0,1,0,0,
		0,0,1,0,
		0,0,0,1)
}

/**
 * Matrix translation
 * @param matrix   matrix to translate
 * @param x       x movement
 * @param y       y movement
 * @param z       z movement
 * @returns {*}   changed matrix
 */
function translateMat(matrix, x, y, z){
	// Apply translation [x, y, z] to @matrix
	// matrix: THREE.Matrix3
	// x, y, z: float
	let matrixTrans = idMat4().set(1,0,0,x,
		0,1,0,y,
		0,0,1,z,
		0,0,0,1)

	return multMat( matrix, matrixTrans);

}



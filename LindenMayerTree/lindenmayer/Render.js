TP3.Render = {

	randomTrans: function (alpha, leaf) {

		let x = Math.random() < 5 ? -Math.random() * alpha / 2 : Math.random() * alpha / 2;
		let z = Math.random() < 5 ? -Math.random() * alpha / 2 : Math.random() * alpha / 2;
		let y;
		if (leaf) {
			y = Math.random() * alpha * 2;
		} else {
			y = Math.random() * alpha;
		}

		let matrix = translateMat(idMat4(), x, y, z);
		let vecteur = new THREE.Vector3(0, 0, 0);
		vecteur = vecteur.applyMatrix4(matrix);

		return vecteur;
	},

	randomRotation: function () {
		let matrix = idMat4();
		matrix = multMat(matrix,idMat4().makeRotationX(Math.random() * 90));
		matrix = multMat(matrix,idMat4().makeRotationY(Math.random() * 90));
		matrix = multMat(matrix,idMat4().makeRotationZ(Math.random() * 90));

		return matrix;
	},


	drawTreeRough: function (rootNode, scene, alpha, radialDivisions = 8, leavesCutoff = 0.01, leavesDensity = 10, matrix = new THREE.Matrix4().identity()) {


		var stack = [];

		stack.push(rootNode);


		while (stack.length > 0) {
			var node = stack.pop();
			for (var i = 0; i < node.childNode.length; i++) {
				stack.push(node.childNode[i]);
			}

			// CREATION DE BRANCHE
			const distance = node.p1.clone().distanceTo(node.p0.clone());
			const geometry = new THREE.CylinderBufferGeometry(node.a1, node.a0, distance, radialDivisions, .5, false);
			const brancheMat = new THREE.MeshLambertMaterial({color: 0x8B5A2B});
			let cylinder = new THREE.Mesh(geometry, brancheMat);


			// PLACEMENT DES BRANCHES
			let vect = node.p1.clone().sub(node.p0.clone());
			let rotation = node.matrix.clone();
			cylinder.applyMatrix4(rotation);
			let translation = translateMat(idMat4(), vect.x * .5, vect.y * .5, vect.z * .5);
			cylinder.applyMatrix4(translation);
			translation = translateMat(idMat4(), node.p0.x, node.p0.y, node.p0.z)
			cylinder.applyMatrix4(translation);

			scene.add(cylinder);

			// CREATION DES FEUILLES
			const feuilleMat = new THREE.MeshPhongMaterial({color: 0x3A5F0B});
			feuilleMat.side = THREE.DoubleSide;
			const geoFeuille = new THREE.PlaneBufferGeometry(alpha, alpha);


			if (node.a0 <= .1 * alpha) {


				for (let i = 0; i < leavesDensity; i++) {
					let feuille = new THREE.Mesh(geoFeuille, feuilleMat);

					let translation;
					if (node.childNode.length === 0) {
						translation = this.randomTrans(distance, true);
					} else {
						translation = this.randomTrans(distance, false);
					}

					translation.applyMatrix4(node.matrix.clone());
					let vect = node.p0.clone().add(translation);

					let transMat = translateMat(idMat4(), vect.x, vect.y, vect.z);

					let rotation = this.randomRotation();

					feuille.applyMatrix4(rotation);
					feuille.applyMatrix4(transMat);

					scene.add(feuille);

				}

			}


		}


	},

	drawTreeHermite: function (rootNode, scene, alpha, leavesCutoff = 0.1, leavesDensity = 10, matrix = new THREE.Matrix4()) {
		let stack = [];

		stack.push(rootNode);
		TP3.Geometry.createCylindre(rootNode);

		while (stack.length > 0) {
			let node = stack.pop();
			for (let i = 0; i < node.childNode.length; i++) {
				stack.push(node.childNode[i]);
			}



			const feuilleMat = new THREE.MeshPhongMaterial({color: 0x3A5F0B});
			feuilleMat.side = THREE.DoubleSide;
			const geoFeuille = new THREE.CircleBufferGeometry(alpha/2,0);
			const distance = node.p1.clone().distanceTo(node.p0.clone());


			if (node.a0 <= .1 * alpha) {


				for (let i = 0; i < leavesDensity; i++) {
					let feuille = new THREE.Mesh(geoFeuille, feuilleMat);

					let translation;
					if (node.childNode.length === 0) {
						translation = this.randomTrans(distance, true);
					} else {
						translation = this.randomTrans(distance, false);
					}

					translation.applyMatrix4(node.matrix.clone());
					let vect = node.p0.clone().add(translation);
					let transMat = translateMat(idMat4(), vect.x, vect.y, vect.z);
					let rotation = this.randomRotation();

					feuille.applyMatrix4(rotation);
					feuille.applyMatrix4(transMat);

					scene.add(feuille);

				}

			}

		}
		return rootNode;

	},

	updateTreeHermite: function (trunkGeometryBuffer, leavesGeometryBuffer, rootNode) {
		//TODO
	},

	drawTreeSkeleton: function (rootNode, scene, color = 0xffffff, matrix = new THREE.Matrix4()) {

		var stack = [];

		stack.push(rootNode);

		var points = [];

		while (stack.length > 0) {
			var currentNode = stack.pop();


			for (var i = 0; i < currentNode.childNode.length; i++) {
				stack.push(currentNode.childNode[i]);
			}

			points.push(currentNode.p0);
			points.push(currentNode.p1);

		}

		var geometry = new THREE.BufferGeometry().setFromPoints(points);
		var material = new THREE.LineBasicMaterial({color: color});
		var line = new THREE.LineSegments(geometry, material);
		line.applyMatrix4(matrix);
		scene.add(line);

		return line.geometry;
	},

	updateTreeSkeleton: function (geometryBuffer, rootNode) {

		var stack = [];
		stack.push(rootNode);

		var idx = 0;
		while (stack.length > 0) {
			var currentNode = stack.pop();

			for (var i = 0; i < currentNode.childNode.length; i++) {
				stack.push(currentNode.childNode[i]);
			}
			geometryBuffer[idx * 6] = currentNode.p0.x;
			geometryBuffer[idx * 6 + 1] = currentNode.p0.y;
			geometryBuffer[idx * 6 + 2] = currentNode.p0.z;
			geometryBuffer[idx * 6 + 3] = currentNode.p1.x;
			geometryBuffer[idx * 6 + 4] = currentNode.p1.y;
			geometryBuffer[idx * 6 + 5] = currentNode.p1.z;

			idx++;
		}
	},


	drawTreeNodes: function (rootNode, scene, color = 0x00ff00, size = 0.05, matrix = new THREE.Matrix4()) {

		var stack = [];
		stack.push(rootNode);

		var points = [];

		while (stack.length > 0) {
			var currentNode = stack.pop();

			for (var i = 0; i < currentNode.childNode.length; i++) {
				stack.push(currentNode.childNode[i]);
			}

			points.push(currentNode.p0);
			points.push(currentNode.p1);

		}

		var geometry = new THREE.BufferGeometry().setFromPoints(points);
		var material = new THREE.PointsMaterial({color: color, size: size});
		var points = new THREE.Points(geometry, material);
		points.applyMatrix4(matrix);
		scene.add(points);

	},


	drawTreeSegments: function (rootNode, scene, lineColor = 0xff0000, segmentColor = 0xffffff, orientationColor = 0x00ff00, matrix = new THREE.Matrix4()) {

		var stack = [];
		stack.push(rootNode);

		var points = [];
		var pointsS = [];
		var pointsT = [];

		while (stack.length > 0) {
			var currentNode = stack.pop();

			for (var i = 0; i < currentNode.childNode.length; i++) {
				stack.push(currentNode.childNode[i]);
			}

			const segments = currentNode.sections;
			for (var i = 0; i < segments.length - 1; i++) {
				points.push(TP3.Geometry.meanPoint(segments[i]));
				points.push(TP3.Geometry.meanPoint(segments[i + 1]));
			}
			for (var i = 0; i < segments.length; i++) {
				pointsT.push(TP3.Geometry.meanPoint(segments[i]));
				pointsT.push(segments[i][0]);
			}

			for (var i = 0; i < segments.length; i++) {

				for (var j = 0; j < segments[i].length - 1; j++) {
					pointsS.push(segments[i][j]);
					pointsS.push(segments[i][j + 1]);
				}
				pointsS.push(segments[i][0]);
				pointsS.push(segments[i][segments[i].length - 1]);
			}
		}

		var geometry = new THREE.BufferGeometry().setFromPoints(points);
		var geometryS = new THREE.BufferGeometry().setFromPoints(pointsS);
		var geometryT = new THREE.BufferGeometry().setFromPoints(pointsT);

		var material = new THREE.LineBasicMaterial({color: lineColor});
		var materialS = new THREE.LineBasicMaterial({color: segmentColor});
		var materialT = new THREE.LineBasicMaterial({color: orientationColor});

		var line = new THREE.LineSegments(geometry, material);
		var lineS = new THREE.LineSegments(geometryS, materialS);
		var lineT = new THREE.LineSegments(geometryT, materialT);

		line.applyMatrix4(matrix);
		lineS.applyMatrix4(matrix);
		lineT.applyMatrix4(matrix);

		scene.add(line);
		scene.add(lineS);
		scene.add(lineT);

	}
}


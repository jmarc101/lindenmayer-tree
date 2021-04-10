TP3.Lindenmayer = {

	iterateGrammar: function (str, dict, iters) {
		let newStr = "";
		for (let i = 0; i < iters; i++) {
			for (let j = 0; j < str.length; j++) {

				let char = str.charAt(j);

				if (char in dict){
					newStr += dict[char].default;
				} else {
					newStr += char;
				}
			}
			str = newStr;
			newStr = "";
		}
		return str;
	},

	iterateGrammarProb: function (str, dict, iters) {
		let newStr = "";

		for (let i = 0; i < iters; i++) {
			for (let j = 0; j < str.length; j++) {

				//0,1 avec equiprobability
				let prob = Math.random() < .5 ? 0 : 1;
				let char = str.charAt(j);

				if (char in dict){
					if ("prob" in dict[char]){
						newStr += dict[char].val[prob];
					} else {
						newStr += dict[char].default;
					}

				} else {
					newStr += char;
				}
			}
			str = newStr;
			newStr = "";
		}
		return str;
	}

};
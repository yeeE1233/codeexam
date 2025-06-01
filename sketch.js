let video;
let handpose;
let handPredictions = [];
let atoms = [];
let targetMolecule = { formula: "H₂O", structure: ["O", "H", "H"] };
let pickedAtoms = [null, null]; // [左手, 右手]
let atomZone = [];
let atomTypes = ["H", "O", "C"];
let atomColors = { H: "#00bfff", O: "#ff4d4d", C: "#888888" };
let bondDistance = 60;

function setup() {
  createCanvas(800, 600).position(
    (windowWidth - 800) / 2,
    (windowHeight - 600) / 2
  );
  video = createCapture(VIDEO);
  video.size(width, height);
  video.hide();

  handpose = ml5.handpose(video, handModelReady);
  handpose.on('predict', results => {
    handPredictions = results;
  });

  // 初始化原子區
  atomZone = [];
  for (let i = 0; i < atomTypes.length; i++) {
    for (let j = 0; j < 3; j++) {
      atomZone.push({
        type: atomTypes[i],
        x: 350 + i * 60,
        y: 400 + j * 40, // <-- 由 450 改為 120
        held: false,
        bonds: []
      });
    }
  }
  atoms = [];
}

function handModelReady() {
  // 手部模型載入完成
}

// 判斷是否碰觸（拇指與食指距離小於閾值）
function isPinching(hand) {
  if (!hand || !hand.landmarks) return false;
  const thumbTip = hand.landmarks[4];
  const indexTip = hand.landmarks[8];
  const d = dist(thumbTip[0], thumbTip[1], indexTip[0], indexTip[1]);
  return d < 50; // 閾值由 40 改為 80，碰觸即可
}

// 取得手的中心點（改用大拇指指尖座標）
function handCenter(hand) {
  if (!hand || !hand.landmarks || hand.landmarks.length < 10) { // 確保 landmarks[0] 和 landmarks[9] 存在
    return [0, 0];
  }
  const wrist = hand.landmarks[0];
  const middleFingerMCP = hand.landmarks[9]; // MCP: Metacarpophalangeal joint (掌指關節)

  const centerX = (wrist[0] + middleFingerMCP[0]) / 2;
  const centerY = (wrist[1] + middleFingerMCP[1]) / 2;
  return [centerX, centerY];
}

function draw() {
  // 鏡像畫面
  push();
  translate(width, 0);
  scale(-1, 1);
  image(video, 0, 0, width, height);
  pop();

  // 顯示目標分子
  fill(0);
  textSize(32);
  textAlign(LEFT, TOP);
  text("目標分子: " + targetMolecule.formula, 10, 10);

  // 顯示已被拖曳的原子
  for (let atom of atoms) {
    fill(atomColors[atom.type]);
    ellipse(atom.x, atom.y, 32, 32);
    fill(255);
    textAlign(CENTER, CENTER);
    text(atom.type, atom.x, atom.y);
    // 畫鍵結
    for (let bonded of atom.bonds) {
      stroke(0);
      line(atom.x, atom.y, bonded.x, bonded.y);
    }
  }

  // 顯示原子區
  for (let atom of atomZone) {
    if (!atom.held) {
      fill(atomColors[atom.type]);
      ellipse(atom.x, atom.y, 32, 32);
      fill(255);
      textAlign(CENTER, CENTER);
      text(atom.type, atom.x, atom.y);
    }
  }

  // 取得鏡像後的手座標
  function mirrorX(x) {
    return width - x;
  }

  // 處理單手
  for (let i = 0; i < handPredictions.length; i++) {
    const hand = handPredictions[i];
    if (hand) {
      const pinching = isPinching(hand);
      let [hx, hy] = handCenter(hand);
      hx = mirrorX(hx);

      // 畫手部中心
      noStroke();
      fill(pinching ? "#ff0" : "#0f0");
      ellipse(hx, hy, 20, 20);

      if (pinching) {
        // 若已經抓住原子，移動它
        if (pickedAtoms[i]) {
          pickedAtoms[i].x = hx;
          pickedAtoms[i].y = hy;
        } else {
          // 檢查是否有原子可抓
          let found = false;
          // 先檢查原子區
          for (let atom of atomZone) {
            if (!atom.held && dist(hx, hy, atom.x, atom.y) < 24) {
              atom.held = true;
              pickedAtoms[i] = {
                type: atom.type,
                x: hx,
                y: hy,
                held: true,
                bonds: []
              };
              atoms.push(pickedAtoms[i]);
              found = true;
              break;
            }
          }
          // 再檢查已拖曳的原子
          if (!found) {
            for (let atom of atoms) {
              if (dist(hx, hy, atom.x, atom.y) < 24 && !atom.held) {
                atom.held = true;
                pickedAtoms[i] = atom;
                break;
              }
            }
          }
        }
      } else {
        // 放下原子
        if (pickedAtoms[i]) {
          pickedAtoms[i].held = false;
          pickedAtoms[i] = null;
        }
      }
    }
  }

  // 只允許 H 和 O 之間自動鍵結
  for (let i = 0; i < atoms.length; i++) {
    for (let j = i + 1; j < atoms.length; j++) {
      let a = atoms[i];
      let b = atoms[j];
      // 只允許 H-O 鍵結
      if (
        dist(a.x, a.y, b.x, b.y) < bondDistance &&
        !a.bonds.includes(b) &&
        !b.bonds.includes(a) &&
        ((a.type === "H" && b.type === "O") || (a.type === "O" && b.type === "H"))
      ) {
        a.bonds.push(b);
        b.bonds.push(a);
      }
    }
  }

  // 檢查是否完成目標分子（簡化判斷）
  if (checkMolecule()) {
    fill("#0f0");
    textSize(48);
    textAlign(CENTER, CENTER);
    text("完成！", width / 2, height / 2);
    noLoop();
  }
}

// 檢查是否組成目標分子（簡單比對原子數量）
function checkMolecule() {
  let counts = {};
  for (let atom of atoms) {
    counts[atom.type] = (counts[atom.type] || 0) + 1;
  }
  let targetCounts = {};
  for (let t of targetMolecule.structure) {
    targetCounts[t] = (targetCounts[t] || 0) + 1;
  }
  for (let t in targetCounts) {
    if (counts[t] !== targetCounts[t]) return false;
  }
  return Object.keys(counts).length === Object.keys(targetCounts).length;
}

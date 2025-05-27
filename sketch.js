let video;
let facemesh;
let handpose;
let predictions = [];
let handPredictions = [];
let circleIndex = 94;

function setup() {
  createCanvas(640, 480).position(
    (windowWidth - 640) / 2,
    (windowHeight - 480) / 2
  );
  video = createCapture(VIDEO);
  video.size(width, height);
  video.hide();

  facemesh = ml5.facemesh(video, modelReady);
  facemesh.on('predict', results => {
    predictions = results;
  });

  handpose = ml5.handpose(video, handModelReady);
  handpose.on('predict', results => {
    handPredictions = results;
  });
}

function modelReady() {
  // 臉部模型載入完成
}

function handModelReady() {
  // 手部模型載入完成
}

// 根據手部特徵判斷剪刀石頭布
function detectHandGesture(hand) {
  if (!hand || !hand.landmarks) return 'paper'; // 預設為布

  // 取得每根手指的末端點
  const tips = [8, 12, 16, 20]; // 食指、中指、無名指、小指
  let extended = 0;
  for (let i = 0; i < tips.length; i++) {
    // 指尖與指根的y座標比較（簡單判斷是否伸直）
    if (hand.landmarks[tips[i]][1] < hand.landmarks[tips[i] - 2][1]) {
      extended++;
    }
  }
  // 大拇指判斷（4號點與2號點x座標）
  let thumbExtended = hand.landmarks[4][0] > hand.landmarks[3][0];

  // 剪刀：2指伸直
  if (extended === 2) return 'scissors';
  // 石頭：0指伸直
  if (extended === 0) return 'rock';
  // 布：4指伸直
  if (extended === 4) return 'paper';
  // 其他狀況預設為布
  return 'paper';
}

function draw() {
  image(video, 0, 0, width, height);

  let gesture = 'paper'; // 預設

  if (handPredictions.length > 0) {
    gesture = detectHandGesture(handPredictions[0]);
  }

  if (predictions.length > 0) {
    const keypoints = predictions[0].scaledMesh;

    // 根據手勢決定圓的位置
    if (gesture === 'scissors') {
      circleIndex = 10;
    } else if (gesture === 'rock') {
      circleIndex = 137;
    } else if (gesture === 'paper') {
      circleIndex = 94;
    }

    // 取得對應點座標並畫圓
    const [x, y] = keypoints[circleIndex];
    noFill();
    stroke(255, 0, 0);
    strokeWeight(4);
    ellipse(x, y, 50, 50);
  }
}

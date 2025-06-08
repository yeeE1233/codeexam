let video;
let handpose;
let predictions = [];

let score = 0;
let maxScore = 5;
let gameOver = false;
let aiMove = "";
let resultText = "";
let timer = 0;

function setup() {
  createCanvas(640, 480);
  video = createCapture(VIDEO);
  video.size(width, height);
  video.hide();

  handpose = ml5.handpose(video, () => {
    console.log('模型已載入');
  });
  handpose.on('predict', (results) => {
    predictions = results;
  });

  setInterval(() => {
    if (!gameOver) timer++;
  }, 1000);
}

function draw() {
  background(0);
  image(video, 0, 0, width, height);

  drawKeypoints();

  fill(255);
  textSize(24);
  text(`分數：${score}/${maxScore}`, 20, 40);
  text(`電腦出：${aiMove}`, 20, 70);
  text(`結果：${resultText}`, 20, 100);

  if (gameOver) {
    fill(0, 255, 0);
    textSize(32);
    text("恭喜通關！", width / 2 - 100, height / 2 - 20);
    text("比出 5 重新開始", width / 2 - 150, height / 2 + 20);

    if (predictions.length > 0) {
      let fingersUp = countFingers(predictions[0]);
      if (fingersUp === 5) {
        resetGame();
      }
    }
    return;
  }

  if (predictions.length > 0 && timer > 3) {
    let fingersUp = countFingers(predictions[0]);
    let playerMove = getMoveFromFingers(fingersUp);
    if (playerMove !== "未知") {
      aiMove = getRandomMove();
      resultText = getResult(playerMove, aiMove);

      if (resultText === "你贏了！") {
        score++;
        if (score >= maxScore) {
          gameOver = true;
        }
      }

      timer = 0;
    }
  }
}

function countFingers(hand) {
  let tips = [8, 12, 16, 20]; // index, middle, ring, pinky tips
  let base = [6, 10, 14, 18];

  let count = 0;
  for (let i = 0; i < tips.length; i++) {
    if (hand.landmarks[tips[i]][1] < hand.landmarks[base[i]][1]) {
      count++;
    }
  }

  let thumbTip = hand.landmarks[4];
  let thumbBase = hand.landmarks[2];
  if (thumbTip[0] > thumbBase[0]) {
    count++;
  }

  return count;
}

function getMoveFromFingers(fingers) {
  if (fingers === 0) return "石頭";
  if (fingers === 2) return "剪刀";
  if (fingers === 5) return "布";
  return "未知";
}

function getRandomMove() {
  let moves = ["石頭", "剪刀", "布"];
  return random(moves);
}

function getResult(player, ai) {
  if (player === ai) return "平手！";
  if (
    (player === "剪刀" && ai === "布") ||
    (player === "布" && ai === "石頭") ||
    (player === "石頭" && ai === "剪刀")
  ) {
    return "你贏了！";
  } else {
    return "你輸了！";
  }
}

function drawKeypoints() {
  for (let i = 0; i < predictions.length; i++) {
    const prediction = predictions[i];
    for (let j = 0; j < prediction.landmarks.length; j++) {
      const [x, y] = prediction.landmarks[j];
      fill(0, 255, 0);
      ellipse(x, y, 10, 10);
    }
  }
}

function resetGame() {
  score = 0;
  timer = 0;
  gameOver = false;
  resultText = "";
  aiMove = "";
}

let video;
let handpose;
let predictions = [];

let score = 0;
let maxScore = 5;
let gameOver = false;
let aiMove = "";
let resultText = "";
let timer = 0;
let roundActive = true; // 新增：判斷本回合是否可猜拳

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
    if (!gameOver && roundActive) timer++;
  }, 1000);
}

function draw() {
  background(100, 149, 237); // 設定為淡藍色背景
  image(video, 0, 0, width, height);

  // 左上角遮罩（分數、電腦出、結果、時間）
  fill(255, 255, 255, 180); // 白色，透明度180/255
  noStroke();
  rect(10, 20, 260, 130, 20); // x, y, w, h, 圓角

  // 右上角遮罩（規則說明）
  fill(255, 255, 255, 180);
  noStroke();
  rect(width - 200, 20, 190, 80, 20);

  drawKeypoints();

  // 教育元素：規則說明
  fill(255, 165, 0);
  textSize(16);
  text("規則：\n石頭贏剪刀\n剪刀贏布\n布贏石頭", width - 180, 40);

  fill(0); // 文字顏色改為黑色
  textSize(24);
  text(`分數：${score}/${maxScore}`, 20, 50);
  text(`電腦出：${aiMove}`, 20, 80);
  text(`結果：${resultText}`, 20, 110);
  text(`剩餘時間：${max(0, 20 - timer)} 秒`, 20, 140);

  // 教育元素：顯示勝負原因
  if (resultText && aiMove && !gameOver && !roundActive) {
    fill(0, 102, 255);
    textSize(18);
    text(getReasonText(resultText, aiMove), 20, 170);
  }

  // 通關畫面與重設功能
  if (gameOver) {
    fill(255); // 文字顏色改為白色，避免黑底黑字看不到
    textSize(32);
    text("恭喜通關！", width / 2 - 100, height / 2 - 20);
    text("比出 5 重新開始", width / 2 - 150, height / 2 + 20);

    // 玩家比出五根手指時重設遊戲
    if (predictions.length > 0) {
      let fingersUp = countFingers(predictions[0]);
      if (fingersUp === 5) {
        resetGame();
      }
    }
    return;
  }

  // 20秒內偵測玩家手勢並猜拳
  if (roundActive && timer <= 20) {
    if (predictions.length > 0) {
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
        roundActive = false; // 本回合結束
      }
    }
  } else if (roundActive && timer > 20) {
    // 20秒內沒出手勢就自動判定失敗
    resultText = "超時，請再試一次！";
    aiMove = "";
    roundActive = false;
  }

  // 若本回合結束，按下空白鍵或點擊畫面可進入下一回合
  if (!roundActive && !gameOver) {
    fill(0);
    textSize(20);
    text("按下空白鍵或點擊畫面進入下一回合", 20, 200);
  }
}

function keyPressed() {
  if (!roundActive && !gameOver && key === ' ') {
    timer = 0;
    aiMove = "";
    resultText = "";
    roundActive = true;
  }
}

// 新增：手機點擊畫面也可進入下一回合
function mousePressed() {
  if (!roundActive && !gameOver) {
    timer = 0;
    aiMove = "";
    resultText = "";
    roundActive = true;
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

// 新增：勝負原因說明
function getReasonText(result, aiMove) {
  if (result === "平手！") return "雙方出一樣，平手！";
  if (result === "你贏了！") {
    if (aiMove === "剪刀") return "石頭贏剪刀，因為石頭可以砸碎剪刀。";
    if (aiMove === "布") return "剪刀贏布，因為剪刀可以剪斷布。";
    if (aiMove === "石頭") return "布贏石頭，因為布可以包住石頭。";
  }
  if (result === "你輸了！") {
    if (aiMove === "剪刀") return "剪刀贏布，因為剪刀可以剪斷布。";
    if (aiMove === "布") return "布贏石頭，因為布可以包住石頭。";
    if (aiMove === "石頭") return "石頭贏剪刀，因為石頭可以砸碎剪刀。";
  }
  return "";
}

// 重設遊戲功能
function resetGame() {
  score = 0;
  aiMove = "";
  resultText = "";
  timer = 0;
  roundActive = true;
  gameOver = false;
}

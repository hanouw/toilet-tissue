// Level definitions for Toilet Rush game

export const LEVELS = [
  {
    id: 1,
    name: "평화로운 거실 (The Peaceful Living Room)",
    intro: "아... 아랫배에서 거대한 파도가 밀려온다. 화장실까지 최단 거리로 달려라! (단, 장애물은 피해가자)",
    hint: "마우스나 터치로 캐릭터에서 변기까지 선을 그리세요!",
    start: { x: 80, y: 300 },
    toilet: { x: 720, y: 300 },
    obstacles: [
      { x: 300, y: 100, width: 60, height: 180, label: "소파 🛋️", color: "#5d4037" },
      { x: 450, y: 320, width: 60, height: 180, label: "TV 선반 📺", color: "#455a64" },
    ],
    puddles: [],
    monsters: [],
    parTime: 8,
    parTissue: 650,
  },
  {
    id: 2,
    name: "침수된 부엌 (The Flooded Kitchen)",
    intro: "싱크대가 고장 나서 바닥이 한강이다! 휴지가 젖으면... 녹아서 끊어져 버린다구! 💦",
    hint: "휴지 끈이 파란색 물웅덩이에 닿지 않도록 우회해서 그리세요!",
    start: { x: 80, y: 150 },
    toilet: { x: 720, y: 450 },
    obstacles: [
      { x: 250, y: 0, width: 80, height: 250, label: "냉장고 🧊", color: "#90a4ae" },
      { x: 480, y: 300, width: 80, height: 300, label: "식탁 🍽️", color: "#8d6e63" },
    ],
    puddles: [
      { x: 400, y: 180, r: 60, label: "싱크대 물 누수 💦" },
      { x: 200, y: 450, r: 50, label: "정수기 흘린 물 💧" },
    ],
    monsters: [],
    parTime: 10,
    parTissue: 850,
  },
  {
    id: 3,
    name: "괴물 고양이의 방 (The Monster Cat's Lair)",
    intro: "댕댕이와 냥냥이가 내 휴지 끈을 호시탐탐 노리고 있다. 그들이 움직이는 타이밍을 맞춰서 건너가라!",
    hint: "몬스터가 휴지 끈을 스치면 끈이 바로 싹둑! 끊어집니다.",
    start: { x: 80, y: 500 },
    toilet: { x: 720, y: 100 },
    obstacles: [
      { x: 200, y: 150, width: 400, height: 60, label: "책상 💻", color: "#6d4c41" },
      { x: 380, y: 350, width: 60, height: 250, label: "책장 📚", color: "#5d4037" },
    ],
    puddles: [],
    monsters: [
      {
        id: "cat1",
        name: "장난꾸러기 고양이 🐱",
        x: 300,
        y: 100,
        r: 25,
        speed: 3.2,
        pathType: "pingpong",
        waypoints: [
          { x: 300, y: 90 },
          { x: 300, y: 510 },
        ],
      },
    ],
    parTime: 12,
    parTissue: 950,
  },
  {
    id: 4,
    name: "지옥의 가습기 지대 (The Humidifier Hell)",
    intro: "물웅덩이와 날쌔게 기어 다니는 로봇 청소기 몬스터가 합작하는 지옥의 복도다. 정신 바짝 차리자!",
    hint: "움직이는 장애물과 물웅덩이를 동시에 피해 신들린 손놀림을 보여주세요.",
    start: { x: 80, y: 300 },
    toilet: { x: 720, y: 300 },
    obstacles: [
      { x: 220, y: 50, width: 80, height: 180, label: "정수기 🚰", color: "#00acc1" },
      { x: 500, y: 370, width: 80, height: 180, label: "쓰레기통 🗑️", color: "#78909c" },
    ],
    puddles: [
      { x: 350, y: 300, r: 55, label: "흘린 커피 ☕" },
      { x: 600, y: 150, r: 40, label: "가습기 수증기 🌫️" },
    ],
    monsters: [
      {
        id: "roomba1",
        name: "미친 로봇청소기 🤖",
        x: 400,
        y: 200,
        r: 20,
        speed: 4,
        pathType: "circle",
        cx: 400,
        cy: 350,
        radius: 120,
        angle: 0,
      },
    ],
    parTime: 14,
    parTissue: 1100,
  },
  {
    id: 5,
    name: "똥 폭풍의 날 (The Poopocalypse)",
    intro: "최후의 관문. 살아있는 거대 똥 몬스터와 고양이, 사방에서 스며드는 누수까지... 모든 괄약근 힘을 모아 돌파하라!",
    hint: "최대한 구불구불하지만 빠른 길을 개척해야 합니다. 똥 몬스터는 플레이어를 향해 서서히 유도됩니다!",
    start: { x: 60, y: 100 },
    toilet: { x: 740, y: 500 },
    obstacles: [
      { x: 220, y: 150, width: 60, height: 350, label: "화장대 🪞", color: "#ec407a" },
      { x: 520, y: 100, width: 60, height: 350, label: "옷장 👗", color: "#8d6e63" },
    ],
    puddles: [
      { x: 140, y: 450, r: 50, label: "천장 누수 💧" },
      { x: 650, y: 180, r: 60, label: "변기 역류 🚽💦" },
    ],
    monsters: [
      {
        id: "poopmonster",
        name: "살아있는 거대 똥 💩",
        x: 390,
        y: 300,
        r: 35,
        speed: 2,
        pathType: "chase",
      },
      {
        id: "cat2",
        name: "미쳐버린 고양이 🐱",
        x: 100,
        y: 280,
        r: 22,
        speed: 5.2,
        pathType: "pingpong",
        waypoints: [
          { x: 80, y: 280 },
          { x: 720, y: 280 },
        ],
      },
    ],
    parTime: 15,
    parTissue: 1400,
  },
  {
    id: 6,
    name: "가전제품의 반란 (The Sparking Maze)",
    intro: "바닥에 피복이 벗겨진 전선들이 어지럽게 널려 있습니다. 전기 스파크가 튀는 타이밍을 맞춰 안전하게 전진하세요! 🔌⚡",
    hint: "주기적으로 번쩍이는 번개/스파크 장애물에 휴지 선이 닿으면 순식간에 타버려 불상사가 생깁니다!",
    start: { x: 80, y: 300 },
    toilet: { x: 720, y: 300 },
    obstacles: [
      { x: 250, y: 50, width: 60, height: 200, label: "선풍기 🔌", color: "#424242" },
      { x: 490, y: 350, width: 60, height: 200, label: "콘센트 ⚡", color: "#424242" },
    ],
    puddles: [],
    monsters: [
      {
        id: "roomba2",
        name: "미친 청소기 🤖",
        x: 400,
        y: 300,
        r: 20,
        speed: 4.5,
        pathType: "pingpong",
        waypoints: [
          { x: 380, y: 100 },
          { x: 380, y: 500 }
        ]
      }
    ],
    sparks: [
      { x: 280, y: 400, r: 35, speed: 0.05, label: "피복 전선 🔌⚡" },
      { x: 520, y: 200, r: 35, speed: 0.05, label: "합선 부위 ⚡" }
    ],
    parTime: 14,
    parTissue: 1100,
  },
  {
    id: 7,
    name: "태풍의 세탁실 (The Laundry Hurricane)",
    intro: "창문이 열리고 대형 세탁 건조기가 오작동하여 엄청난 태풍이 붑니다! 휴지가 바람에 마구 휘어집니다. 🌀💨",
    hint: "바람이 부는 파란 점선 영역에서는 휴지 선이 강제로 우측으로 밀립니다! 바람을 감안해 왼쪽으로 치우쳐 그리세요.",
    start: { x: 80, y: 150 },
    toilet: { x: 720, y: 450 },
    obstacles: [
      { x: 200, y: 0, width: 80, height: 200, label: "세탁기 🧼", color: "#607d8b" },
      { x: 520, y: 400, width: 80, height: 200, label: "건조기 🌪️", color: "#546e7a" },
    ],
    puddles: [
      { x: 150, y: 450, r: 40, label: "비눗물 💧" }
    ],
    monsters: [],
    windZone: {
      x: 180,
      y: 100,
      width: 440,
      height: 400,
      forceX: 1.5,
      forceY: 0,
      label: "강풍 발생 구역 🌀💨"
    },
    parTime: 12,
    parTissue: 1050,
  },
  {
    id: 8,
    name: "어머니의 불시 습격 (The Sudden Guest)",
    intro: "가장 가혹한 마지막 시련. 방을 청소하러 돌아다니시는 어머니께 들키면(어머니 시야에 들어가면) 부끄러움에 주저앉습니다! 👵🚨",
    hint: "어머니 앞쪽으로 뻗어있는 원형 시야 범위를 조심히 피하세요. 고양이 몬스터도 사방에서 기어다닙니다!",
    start: { x: 80, y: 300 },
    toilet: { x: 720, y: 300 },
    obstacles: [
      { x: 250, y: 80, width: 80, height: 160, label: "옷장 🚪", color: "#795548" },
      { x: 470, y: 360, width: 80, height: 160, label: "수납장 📦", color: "#8d6e63" },
    ],
    puddles: [
      { x: 360, y: 300, r: 50, label: "물걸레질 바닥 💦" }
    ],
    monsters: [
      {
        id: "cat_final",
        name: "도둑고양이 🐱",
        x: 150,
        y: 450,
        r: 20,
        speed: 4,
        pathType: "pingpong",
        waypoints: [
          { x: 100, y: 450 },
          { x: 700, y: 450 }
        ]
      }
    ],
    motherPatrol: {
      name: "순찰 도는 어머니 👵",
      x: 360,
      y: 120,
      r: 20,
      sightRadius: 100,
      speed: 2.2,
      pathType: "pingpong",
      waypoints: [
        { x: 360, y: 100 },
        { x: 360, y: 500 }
      ]
    },
    parTime: 16,
    parTissue: 1200,
  },
  {
    id: 9,
    name: "스프링클러 미로 (The Maze Sprinkler)",
    intro: "방안 가득 화재 감지 스프링클러가 멋대로 물줄기를 뿜고 있습니다! 물줄기가 사그라들 때 타이밍을 맞춰 전진하세요! 🚿💦",
    hint: "주기적으로 십자(+) 모양으로 뻗어나가는 물줄기에 휴지가 닿으면, 물에 젖어 바로 찢어지고 끊어집니다!",
    start: { x: 85, y: 150 },
    toilet: { x: 720, y: 450 },
    obstacles: [
      { x: 250, y: 0, width: 60, height: 220, label: "벽체 🧱", color: "#37474f" },
      { x: 490, y: 380, width: 60, height: 220, label: "벽체 🧱", color: "#37474f" }
    ],
    puddles: [],
    monsters: [],
    sprinklers: [
      { x: 250, y: 400, r: 16, length: 140, pulseSpeed: 0.04, label: "분사기 🚿" },
      { x: 550, y: 200, r: 16, length: 140, pulseSpeed: 0.035, label: "분사기 🚿" }
    ],
    parTime: 14,
    parTissue: 1100,
  },
  {
    id: 10,
    name: "지뢰밭 화장실 (The Fart Bomb Zone)",
    intro: "바닥에 조심성 없는 동생이 유황 똥 폭탄 지뢰들을 흩뿌려 두었습니다. 닿기만 해도 대형 폭발사고가 일어납니다! 💩💣💥",
    hint: "바닥의 똥 지뢰를 밟거나, 그 위에 휴지 선이 올려져 있으면 즉시 폭발하여 바지가 뜨거워집니다! 완벽히 우회하세요.",
    start: { x: 80, y: 300 },
    toilet: { x: 720, y: 300 },
    obstacles: [
      { x: 380, y: 150, width: 60, height: 300, label: "파티션 🧱", color: "#4e342e" }
    ],
    puddles: [],
    monsters: [],
    bombs: [
      { x: 200, y: 150, r: 24, label: "똥지뢰 💩💣" },
      { x: 200, y: 450, r: 24, label: "똥지뢰 💩💣" },
      { x: 600, y: 150, r: 24, label: "똥지뢰 💩💣" },
      { x: 600, y: 450, r: 24, label: "똥지뢰 💩💣" }
    ],
    parTime: 12,
    parTissue: 1150,
  },
  {
    id: 11,
    name: "살아있는 웅덩이 (The Mirage Oasis)",
    intro: "오 마이 갓! 화장실 앞 수도관이 완전히 터져서 물웅덩이들이 살아서 꿈틀꿈틀 방바닥을 돌아다닙니다! 💦🌀",
    hint: "웅덩이들이 일정한 궤도로 배회하므로, 타이밍을 극대화하여 물이 피하는 찰나에 빠르게 선을 긋고 질주해야 합니다.",
    start: { x: 80, y: 150 },
    toilet: { x: 720, y: 450 },
    obstacles: [
      { x: 450, y: 100, width: 60, height: 400, label: "싱크대 🚰", color: "#37474f" }
    ],
    puddles: [], // we will place moving puddles here
    movingPuddles: [
      {
        id: "mp1",
        x: 250,
        y: 100,
        r: 60,
        speed: 2.5,
        pathType: "pingpong",
        waypoints: [
          { x: 250, y: 100 },
          { x: 250, y: 500 }
        ],
        label: "흘러가는 물 💦"
      },
      {
        id: "mp2",
        x: 620,
        y: 500,
        r: 50,
        speed: 3.0,
        pathType: "pingpong",
        waypoints: [
          { x: 620, y: 500 },
          { x: 620, y: 100 }
        ],
        label: "흘러가는 물 💦"
      }
    ],
    monsters: [],
    parTime: 13,
    parTissue: 1000,
  },
  {
    id: 12,
    name: "반려견의 습격 (The Puppy Chase)",
    intro: "고양이보다 세 배는 더 날렵하고 거칠게 기어 다니는 광폭 불독이 내 휴지를 물어뜯기 위해 쫓아옵니다! 🐶🦴",
    hint: "불독은 고속으로 사각형 궤도를 돕니다. 그 속도가 엄청나므로 타이밍을 놓치면 바로 휴지 끈이 끊어집니다!",
    start: { x: 80, y: 500 },
    toilet: { x: 720, y: 100 },
    obstacles: [
      { x: 300, y: 200, width: 200, height: 200, label: "개집 🏠", color: "#8d6e63" }
    ],
    puddles: [],
    monsters: [
      {
        id: "puppy1",
        name: "지랄견 불독 🐶",
        x: 200,
        y: 150,
        r: 25,
        speed: 6.8, // extremely fast!
        pathType: "pingpong", // travels in a loop
        waypoints: [
          { x: 180, y: 120 },
          { x: 620, y: 120 },
          { x: 620, y: 480 },
          { x: 180, y: 480 }
        ]
      }
    ],
    parTime: 12,
    parTissue: 1200,
  },
  {
    id: 13,
    name: "우주 종말의 변기 (The Toilet Apocalypse)",
    intro: "축하합니다. 대장정의 완결판. 모든 방해 요소들이 한자리에 모였습니다. 당신의 괄약근 한계에 직면하십시오! 🚽🌪️💥",
    hint: "순찰 도는 어머니, 피복 스파크, 쫓아오는 똥 몬스터, 똥 지뢰, 움직이는 물웅덩이까지 모두 존재합니다. 완벽한 판단력만이 살길입니다.",
    start: { x: 60, y: 80 },
    toilet: { x: 740, y: 520 },
    obstacles: [
      { x: 220, y: 50, width: 60, height: 220, label: "장식장 🧱", color: "#37474f" },
      { x: 520, y: 330, width: 60, height: 220, label: "수납장 🧱", color: "#37474f" }
    ],
    puddles: [],
    movingPuddles: [
      {
        id: "mp_final",
        x: 400,
        y: 450,
        r: 55,
        speed: 2.2,
        pathType: "pingpong",
        waypoints: [
          { x: 300, y: 450 },
          { x: 650, y: 450 }
        ],
        label: "넘친 수조 물 💦"
      }
    ],
    monsters: [
      {
        id: "poop_final",
        name: "살아있는 거대 똥 💩",
        x: 390,
        y: 300,
        r: 32,
        speed: 2.2,
        pathType: "chase",
      }
    ],
    sparks: [
      { x: 150, y: 420, r: 30, speed: 0.05, label: "전기 누전 🔌⚡" }
    ],
    bombs: [
      { x: 450, y: 150, r: 20, label: "지뢰 💩" }
    ],
    motherPatrol: {
      name: "순찰 어머니 👵",
      x: 600,
      y: 100,
      r: 20,
      sightRadius: 90,
      speed: 2.5,
      pathType: "pingpong",
      waypoints: [
        { x: 650, y: 220 },
        { x: 650, y: 500 }
      ]
    },
    parTime: 18,
    parTissue: 1400,
  }
];

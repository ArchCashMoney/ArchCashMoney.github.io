let season = 1;
let team = [];
let recruits = [];
let careerHistory = [];
let selectedTeamName = '';
let selectedTeamConference = '';
let allTeamsData = [];

const conferences = {
  "ACC": [
    "Boston College Eagles", "Cal Golden Bears", "Clemson Tigers", "Duke Blue Devils",
    "Florida State Seminoles", "Georgia Tech Yellow Jackets", "Louisville Cardinals", "Miami Hurricanes",
    "NC State Wolfpack", "North Carolina Tar Heels", "Pitt Panthers", "SMU Mustangs",
    "Stanford Cardinal", "Syracuse Orange", "Virginia Cavaliers", "Virginia Tech Hokies",
    "Wake Forest Demon Deacons"
  ],
  "American Conference": [
    "Army Black Knights", "Charlotte 49ers", "East Carolina Pirates", "FAU Owls",
    "Memphis Tigers", "Navy Midshipmen", "North Texas Mean Green", "Rice Owls",
    "South Florida Bulls", "Temple Owls", "Tulane Green Wave", "Tulsa Golden Hurricane",
    "UAB Blazers", "UTSA Roadrunners"
  ],
  "Big 12": [
    "Arizona Wildcats", "Arizona State Sun Devils", "Baylor Bears", "BYU Cougars",
    "Cincinnati Bearcats", "Colorado Buffaloes", "Houston Cougars", "Iowa State Cyclones",
    "Kansas Jayhawks", "Kansas State Wildcats", "Oklahoma State Cowboys", "TCU Horned Frogs",
    "Texas Tech Red Raiders", "UCF Knights", "Utah Utes", "West Virginia Mountaineers"
  ],
  "Big Ten": [
    "Illinois Fighting Illini", "Indiana Hoosiers", "Iowa Hawkeyes", "Maryland Terrapins",
    "Michigan Wolverines", "Michigan State Spartans", "Minnesota Golden Gophers", "Nebraska Cornhuskers",
    "Northwestern Wildcats", "Ohio State Buckeyes", "Oregon Ducks", "Penn State Nittany Lions",
    "Purdue Boilermakers", "Rutgers Scarlet Knights", "UCLA Bruins", "USC Trojans",
    "Washington Huskies", "Wisconsin Badgers"
  ],
  "Conference USA": [
    "Delaware Blue Hens", "FIU Panthers", "Jacksonville State Gamecocks", "Kennesaw State Owls",
    "Liberty Flames", "MTSU Blue Raiders", "Missouri State Bears", "New Mexico State Aggies", 
    "Sam Houston Bearkats", "Western Kentucky Hilltoppers"
  ],
  "FBS Independents": [
    "Notre Dame Fighting Irish", "UConn Huskies"
  ],
  "MAC": [
    "Akron Zips", "Ball State Cardinals", "Bowling Green Falcons", "Buffalo Bulls",
    "Central Michigan Chippewas", "Eastern Michigan Eagles", "Kent State Golden Flashes", "UMass Minutemen",
    "Miami (Ohio) RedHawks", "Ohio Bobcats", "Sacramento State Hornets", "Toledo Rockets", 
    "Western Michigan Broncos"
  ],
  "Mountain West": [
    "Air Force Falcons", "Hawai'i Rainbow Warriors", "Nevada Wolf Pack", "New Mexico Lobos",
    "North Dakota State Bison", "Northern Illinois Huskies", "San Jose State Spartans", "UNLV Rebels", 
    "UTEP Miners", "Wyoming Cowboys"
  ],
  "Pac-12": [
    "Boise State Broncos", "Colorado State Rams", "Fresno State Bulldogs", "Oregon State Beavers", 
    "San Diego State Aztecs", "Texas State Bobcats", "Utah State Aggies", "Washington State Cougars"
  ],
  "SEC": [
    "Alabama Crimson Tide", "Arkansas Razorbacks", "Auburn Tigers", "Florida Gators",
    "Georgia Bulldogs", "Kentucky Wildcats", "LSU Tigers", "Mississippi State Bulldogs",
    "Mizzou Tigers", "Oklahoma Sooners", "Mississippi Rebels", "South Carolina Gamecocks",
    "Tennessee Volunteers", "Texas A&M Aggies", "Texas Longhorns", "Vanderbilt Commodores"
  ],
  "Sun Belt": [
    "Appalachian State Mountaineers", "Arkansas State Red Wolves", "Coastal Carolina Chanticleers", "Georgia Southern Eagles",
    "Georgia State Panthers", "James Madison Dukes", "Louisiana Ragin' Cajuns", "Louisiana Tech Bulldogs", 
    "Marshall Thundering Herd", "Old Dominion Monarchs", "South Alabama Jaguars", "Southern Miss Golden Eagles", 
    "Troy Trojans", "UL Monroe Warhawks"
  ]
};

let seasonSchedule = [];
let leagueSchedule = [];
let currentWeek = 0;
let seasonResults = [];
const SEASON_WEEKS = 12;

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function conferenceGameCount(conference) {
  if (["Big 12", "Big Ten", "SEC"].includes(conference)) return 9;
  if (conference === "Pac-12") return 7;
  if (conference === "FBS Independents") return 0;
  return 8;
}

function matchupKey(a, b) {
  return a < b ? a + "\u0000" + b : b + "\u0000" + a;
}

function roundRobinRounds(names) {
  const rotation = shuffle([...names]);
  if (rotation.length % 2 !== 0) rotation.push(null);

  const rounds = [];
  for (let round = 0; round < rotation.length - 1; round++) {
    const games = [];
    let bye = null;

    for (let i = 0; i < rotation.length / 2; i++) {
      const a = rotation[i];
      const b = rotation[rotation.length - 1 - i];
      if (a && b) games.push([a, b]);
      else bye = a || b;
    }

    rounds.push({ games, bye });
    rotation.splice(1, 0, rotation.pop());
  }
  return rounds;
}

function pairUnplayedConferenceTeams(names, playedPairs) {
  if (names.length === 0) return [];

  const first = names[0];
  for (const opponent of shuffle(names.slice(1))) {
    if (playedPairs.has(matchupKey(first, opponent))) continue;

    const remaining = names.filter(name => name !== first && name !== opponent);
    const otherPairs = pairUnplayedConferenceTeams(remaining, playedPairs);
    if (otherPairs !== null) return [[first, opponent], ...otherPairs];
  }
  return null;
}

function pairRemainingTeams(names, conferenceByTeam, playedPairs) {
  if (names.length % 2 !== 0) return null;

  const conferenceCounts = new Map();
  for (const name of names) {
    const conference = conferenceByTeam.get(name);
    conferenceCounts.set(conference, (conferenceCounts.get(conference) || 0) + 1);
  }
  if ([...conferenceCounts.values()].some(count => count > names.length / 2)) {
    return null;
  }
  
// Try different pairings if an early choice leaves two teams that cannot play.
  for (let attempt = 0; attempt < 40; attempt++) {
    let remaining = shuffle([...names]);
    const games = [];
    let failed = false;

    while (remaining.length > 0) {
      let first = null;
      let choices = null;

      for (const name of remaining) {
        const available = remaining.filter(other =>
          other !== name &&
          conferenceByTeam.get(other) !== conferenceByTeam.get(name) &&
          !playedPairs.has(matchupKey(name, other))
        );
        if (available.length === 0) {
          failed = true;
          break;
        }
        if (choices === null || available.length < choices.length) {
          first = name;
          choices = available;
        }
      }
      if (failed) break;

      const opponent = shuffle(choices)[0];
      games.push([first, opponent]);
      remaining = remaining.filter(name => name !== first && name !== opponent);
    }

    if (!failed) return games;
  }
  return null;
}

function validateLeagueSchedule(weeks, teamNames, conferenceByTeam) {
  const playedPairs = new Set();
  const conferenceGames = new Map(teamNames.map(name => [name, 0]));

  for (const games of weeks) {
    if (games.length !== teamNames.length / 2) return false;
    const teamsThisWeek = new Set();

    for (const [a, b] of games) {
      if (a === b || teamsThisWeek.has(a) || teamsThisWeek.has(b)) return false;
      const key = matchupKey(a, b);
      if (playedPairs.has(key)) return false;
      playedPairs.add(key);
      teamsThisWeek.add(a);
      teamsThisWeek.add(b);

      if (conferenceByTeam.get(a) === conferenceByTeam.get(b)) {
        conferenceGames.set(a, conferenceGames.get(a) + 1);
        conferenceGames.set(b, conferenceGames.get(b) + 1);
      }
    }
    if (teamsThisWeek.size !== teamNames.length) return false;
  }

  return teamNames.every(name =>
    conferenceGames.get(name) === conferenceGameCount(conferenceByTeam.get(name))
  );
}

function chooseConferenceWeekPlans() {
  const weeks = Array.from({ length: SEASON_WEEKS }, (_, week) => week);
  const unscheduledConferences = Object.entries(conferences)
    .filter(([conference]) => conferenceGameCount(conference) === 0);
  const alwaysFree = unscheduledConferences
    .reduce((count, [, names]) => count + names.length, 0);
  const freeLoad = Array(SEASON_WEEKS).fill(alwaysFree);

  // An odd conference has one unpaired team in every round.
  for (const [conference, names] of Object.entries(conferences)) {
    if (conferenceGameCount(conference) > 0 && names.length % 2 !== 0) {
      for (const week of weeks) freeLoad[week]++;
    }
  }

  const entries = shuffle(
    Object.entries(conferences).filter(([conference]) =>
      conferenceGameCount(conference) > 0
    )
  ).sort((a, b) => b[1].length - a[1].length);

  const plans = new Map();
  for (const [conference, names] of entries) {
    const requiredGames = conferenceGameCount(conference);
    const odd = names.length % 2 !== 0;
    const fullFreeCount = SEASON_WEEKS - requiredGames - (odd ? 1 : 0);
    if (fullFreeCount < 0) return null;

    const fullFreeWeeks = new Set();
    for (let i = 0; i < fullFreeCount; i++) {
      const options = shuffle(weeks.filter(week => !fullFreeWeeks.has(week)));
      options.sort((a, b) => freeLoad[a] - freeLoad[b]);
      const chosen = options[0];
      fullFreeWeeks.add(chosen);
      freeLoad[chosen] += names.length - (odd ? 1 : 0);
    }

    let extraWeek = null;
    if (odd) {
      const options = shuffle(weeks.filter(week => !fullFreeWeeks.has(week)));
      options.sort((a, b) => freeLoad[a] - freeLoad[b]);
      extraWeek = options[0];
      freeLoad[extraWeek] += names.length - requiredGames - 1;
    }

    plans.set(conference, {
      conferenceWeeks: shuffle(
        weeks.filter(week => !fullFreeWeeks.has(week) && week !== extraWeek)
      ),
      extraWeek,
      fullFreeWeeks
    });
  }

  for (const week of weeks) {
    const largestGroup = Math.max(...entries.map(([conference, names]) => {
      const plan = plans.get(conference);
      if (plan.fullFreeWeeks.has(week)) return names.length;
      if (plan.extraWeek === week) return names.length - conferenceGameCount(conference);
      return names.length % 2;
    }), ...unscheduledConferences.map(([, names]) => names.length));
    if (largestGroup > freeLoad[week] / 2) return null;
  }

  return plans;
}

function createLeagueSchedule() {
  const teamNames = Object.values(conferences).flat();
  const conferenceByTeam = new Map(
    Object.entries(conferences).flatMap(([conference, names]) =>
      names.map(name => [name, conference])
    )
  );

  if (teamNames.length % 2 !== 0 || conferenceByTeam.size !== teamNames.length) {
    throw new Error("The league needs an even number of unique teams.");
  }
  for (const [conference, names] of Object.entries(conferences)) {
    const requiredGames = conferenceGameCount(conference);
    if (requiredGames > Math.min(SEASON_WEEKS, names.length - 1) ||
        (names.length * requiredGames) % 2 !== 0) {
      throw new Error(`Conference game target is impossible for ${conference}.`);
    }
  }

  for (let attempt = 0; attempt < 100; attempt++) {
    const weeks = Array.from({ length: SEASON_WEEKS }, () => []);
    const scheduledThisWeek = Array.from({ length: SEASON_WEEKS }, () => new Set());
    const playedPairs = new Set();

    const addGame = (week, a, b) => {
      const key = matchupKey(a, b);
      if (scheduledThisWeek[week].has(a) ||
          scheduledThisWeek[week].has(b) ||
          playedPairs.has(key)) {
        throw new Error("Conflicting league matchup.");
      }
      weeks[week].push([a, b]);
      scheduledThisWeek[week].add(a);
      scheduledThisWeek[week].add(b);
      playedPairs.add(key);
    };

    let possible = true;
    const weekPlans = chooseConferenceWeekPlans();
    if (weekPlans === null) continue;

    // Schedule conference games first. Odd-sized conferences have one bye per round.
    for (const [conference, names] of Object.entries(conferences)) {
      const requiredGames = conferenceGameCount(conference);
      if (requiredGames === 0) continue;
      const rounds = roundRobinRounds(names);
      const byes = [];
      const plan = weekPlans.get(conference);

      for (let round = 0; round < requiredGames; round++) {
        const week = plan.conferenceWeeks[round];
        for (const [a, b] of rounds[round].games) addGame(week, a, b);
        if (rounds[round].bye) byes.push(rounds[round].bye);
      }

      // Pair teams that had a conference bye so each reaches its season target.
      if (byes.length > 0) {
        if (byes.length % 2 !== 0 || plan.extraWeek === null) {
          possible = false;
          break;
        }
        const extraGames = pairUnplayedConferenceTeams(shuffle(byes), playedPairs);
        if (extraGames === null) {
          possible = false;
          break;
        }
        for (const [a, b] of extraGames) addGame(plan.extraWeek, a, b);
      }
    }
    if (!possible) continue;

    // Fill every open slot with a nonconference game.
    for (let week = 0; week < SEASON_WEEKS; week++) {
      const remaining = teamNames.filter(name => !scheduledThisWeek[week].has(name));
      const games = pairRemainingTeams(remaining, conferenceByTeam, playedPairs);
      if (games === null) {
        possible = false;
        break;
      }
      for (const [a, b] of games) addGame(week, a, b);
    }

    if (possible && validateLeagueSchedule(weeks, teamNames, conferenceByTeam)) {
      return weeks;
    }
  }

  throw new Error("Could not make a complete league schedule.");
}

function startSeason(teamStrength) {
  const userTeam = allTeamsData.find(t => t.name === selectedTeamName);
  if (!userTeam) throw new Error("Select a team before starting the season.");
  userTeam.strength = teamStrength;

  leagueSchedule = createLeagueSchedule();
  seasonSchedule = leagueSchedule.map(games => {
    const matchup = games.find(([a, b]) =>
      a === selectedTeamName || b === selectedTeamName
    );
    return matchup[0] === selectedTeamName ? matchup[1] : matchup[0];
  });
  currentWeek = 0;
  seasonResults = [];
  rankTeams();
  renderTop25();
  document.getElementById("top25Rankings").style.display = "block";
}

function simulateWeek() {
  if (currentWeek >= leagueSchedule.length) return null;

  const teamsByName = new Map(allTeamsData.map(team => [team.name, team]));
  let userGame = null;

  for (const [aName, bName] of leagueSchedule[currentWeek]) {
    const teamA = teamsByName.get(aName);
    const teamB = teamsByName.get(bName);
    const difference = teamA.strength - teamB.strength;
    const winChance = 1 / (1 + Math.exp(-2.5 * difference));
    const teamAWon = Math.random() < winChance;

    if (teamAWon) {
      teamA.wins++;
      teamB.losses++;
    } else {
      teamA.losses++;
      teamB.wins++;
    }

    if (aName === selectedTeamName || bName === selectedTeamName) {
      const opponent = aName === selectedTeamName ? teamB : teamA;
      const opponentRank = allTeamsData.indexOf(opponent) + 1;
      const userWon = aName === selectedTeamName ? teamAWon : !teamAWon;
      userGame = {
        week: currentWeek + 1,
        opponent: opponent.name,
        opponentRank: opponentRank <= 25 ? opponentRank : null,
        strength: opponent.strength.toFixed(1),
        result: userWon ? "✅ Win" : "❌ Loss"
      };
    }
  }

  if (!userGame) throw new Error("The user's game is missing from this week.");
  seasonResults.push(userGame);
  currentWeek++;
  return userGame;
}

const positions = ["QB", "RB", "WR", "TE", "OL", "DL", "LB", "CB", "S"];
const classYears = ["FRESHMAN", "SOPHOMORE", "JUNIOR", "SENIOR"];

const positionAttributes = {
  QB: ["Football IQ", "Accuracy", "Pocket Presence", "Leadership"],
  RB: ["Speed", "Vision", "Strength", "Technique"],
  WR: ["Speed", "Hands", "Routes", "Physicality"],
  TE: ["Blocking", "Hands", "Strength", "Speed"],
  OL: ["Run Block", "Pass Block", "Strength", "Agility"],
  DL: ["Strength", "Power Moves", "Finese Moves", "Tackling"],
  LB: ["Hit Power/Strength", "Vision", "Leadership", "Tackling"],
  CB: ["Coverage", "Speed", "Vision", "Tackling"],
  S:  ["Coverage", "Speed", "Vision", "Tackling"]
};

const positionAttributeWeights = {
  QB: [0.35, 0.35, 0.2, 0.1],
  RB: [0.35, 0.25, 0.25, 0.15],
  WR: [0.30, 0.25, 0.25, 0.20],
  TE: [0.30, 0.25, 0.25, 0.20],
  OL: [0.30, 0.30, 0.25, 0.15],
  DL: [0.30, 0.30, 0.2, 0.2],
  LB: [0.30, 0.20, 0.30, 0.20],
  CB: [0.30, 0.25, 0.35, 0.1],
  S:  [0.30, 0.25, 0.25, 0.20]
};

const gradeValues = { A:4.0, "A-":3.7, "B+":3.3, B:3.0, "B-":2.7, "C+":2.3, C:2.0, "C-":1.7, "D+":1.3 };

function numericToGrade(num) {
  let closest = "C";
  let minDiff = Infinity;
  for (const [grade, val] of Object.entries(gradeValues)) {
    const diff = Math.abs(val - num);
    if (diff < minDiff) { minDiff = diff; closest = grade; }
  }
  return closest;
}

function getRandomName() {
  const first = ["Jamal", "Jackson", "Tyrone", "Liam", "DeShawn", "Hunter", "Kai", "Caleb", "Riley", "John", "Doneiko", "Kay", "Kermit", "Gus", "Djouvensky", "Hannes", "Panda", "Alpha", "Jaden", "Andrew", "James", "Thomas", "Dude", "Demon", "Sirr", "King", "Squirrel", "Deuce", "Chief", "Legend", "Grant", "Rocky", "Nitro", "Blazen", "Moh", "Da'Realyst", "Noah", "General", "Mike", "Michael", "Dick", "Poona", "Jamoris", "Equanimeous", "Wave", "I-Perfection", "Pig", "Kool-Aid", "Bumper", "Barkevious", "Jonathan", "Lil'Jordan", "Coby", "Kobe", "Cobee", "Divine", "Rachad", "Rachaad", "Leroy", "Quantavius", "Swayze", "Corn", "Smoke", "Steele", "Yourhighness", "Oxendine", "Silverberry", "Gentle", "T-Bob", "Guy", "Lloyd", "Luther", "Pork Chop", "Kyle", "Golden", "Phat", "Boobie", "Chris", "Manti", "BJ", "Jim", "Monte", "Munchie", "Jim Bob", "I.M.", "Isiah", "Moses", "Walter", "Bryce", "Taylor", "Lawrence", "Alex", "Julius", "Emmitt", "Barry", "Bo", "Steve", "Geno", "Bruce", "Mike", "Young", "William", "Lamar", "Ha-Ha", "Calvin", "Andre", "Drew", "Brad", "Joe", "Tez", "Lane", "Antonio", "Ben", "Marshawn", "Carson", "Robert", "Nate", "Darnell", "A.J.", "Amon-Ra", "Marquise", "Javonte", "Jameson", "Jamaal", "Storm", "Lucious", "Happy", "Lion", "Memorable", "Bronko", "Dee", "Tiger", "D'Brickashaw", "Jake", "Parker", "Decoldest", "Peerless", "Jimmy", "Buster"];
  const last = ["Johnson", "Taylor", "King", "Allen", "Moore", "Jackson", "Lewis", "Robinson", "Mertens", "Witkowski", "Thomas", "Keller", "Sellers", "Williams", "Aguilar", "Knigga", "James", "Andrews", "Clark", "Bility", "Lono-Wong", "Tuggle", "Beers", "Beerman", "Journey", "Borders", "Knight", "White", "Large", "Bible", "Clowney", "Person", "Muskrat", "Khan", "Schlenbaker", "Askew", "Hammer", "Ferguson", "Booty", "Felt", "Ford", "Slaughter", "St. Brown", "Ryder", "Harris", "Cage", "McKinstry", "Pool", "Mingo", "Jordan", "Humphrey", "Bryant", "Deablo", "Wildgoose", "White", "Ambush", "Butkus", "Sturdivant", "Waters", "Elder", "Monday", "Stonebreaker", "Morgan", "Chambers", "Oxendine", "Mouhon", "Hebert", "Whimper", "Cushenberry III", "Burden III", "Sackrider", "Womack", "Tate", "Watts", "Feaster", "Fuamatu-Ma'afala", "Te'o", "Cooter", "Bob Cooter", "Dickey", "Cristo", "Legaux", "Hipp", "Young", "Lawrence", "Taylor", "Smith", "Peppers", "Chestnut", "Smith", "Sanders", "Jones", "Johnson", "Boozer", "Buffalomeat", "Shakespeare", "Blewitt", "Clinton-Dix", "Roethlisberger", "Brees", "Lynch", "Carson", "Roberts", "Robertson", "Turbin", "Rawls", "Brown", "Washington", "Duck", "Pusey", "Titsworth", "Factor", "Nagurski", "Liner", "Shanks", "Butt", "Elliott", "Cabell", "Rhymes", "Price", "Crawford", "Johns"];
//  const first = ["A.J."];
//  const last = ["Brown"];

  const firstName = first[Math.floor(Math.random() * first.length)];
  const lastName = last[Math.floor(Math.random() * last.length)];
  
  if (firstName === "Mike" && lastName === "Jones") {
    return "Mike 'WHO' Jones";
  }
  else if (firstName === "Chris" && lastName === "Johnson") {
    return "CJ2K";
  }
  else if (firstName === "Michael" && lastName === "Jordan") {
    return "🐐";
  }
  else if (firstName === "Marquise" && lastName === "Brown") {
    return "Hollywood Brown";
  }
  else if (firstName === "Marshawn" && lastName === "Lynch") {
    return "Beast Mode";
  }
  else if (firstName === "Ben" && lastName === "Rothlisberger") {
    return "Big Ben";
  }
  else if (firstName === "Kobe" && lastName === "Bryant") {
    return "Black Mamba";
  }
  else if (firstName === "Calvin" && lastName === "Johnson") {
    return "Megatron";
  }
  else if (firstName === "Amon-Ra" && lastName === "St. Brown") {
    return "Sun God";
  }

  else if (firstName === "A.J." && lastName === "Brown") {
    const randomNum = Math.random();
    if (randomNum < 0.33)  return "Swole Batman";
    else if (randomNum < 0.67) return "Batman";
    else return "A.J. Brown Deepball";
  }

  else if (firstName === "Lawrence" && lastName === "Taylor") {
    return "L.T.";
  }

  else if (firstName === "Jameson" && lastName === "Williams") {
    const randomNum = Math.random();
    if (randomNum < 0.5) {
      return "Best Gambler in the Game";
    } else {
      return "Jamo";
    }
  }

  else if (firstName === "" && lastName === "") {
    return "";
  }
  else if (firstName === "" && lastName === "") {
    return "";
  }
  else return `${firstName} ${lastName}`;

}

function getRandomGrade() {
  const grades = Object.keys(gradeValues);
  return grades[Math.floor(Math.random() * grades.length)];
}

function calculateOverallWeighted(ratings, pos) {
  const attributes = positionAttributes[pos];
  const weights = positionAttributeWeights[pos];
  let total = 0;
  for (let i = 0; i < attributes.length; i++) {
    total += gradeValues[ratings[attributes[i]]] * weights[i];
  }
  return numericToGrade(total);
}

function generatePlayer(isRecruit = false, pos = null) {
  const chosenPos = pos || positions[Math.floor(Math.random() * positions.length)];
  const attributes = positionAttributes[chosenPos];
  const ratings = {};
  attributes.forEach(attr => ratings[attr] = getRandomGrade());
  const overall = calculateOverallWeighted(ratings, chosenPos);
  return {
    name: getRandomName(),
    pos: chosenPos,
    class: isRecruit ? "FRESHMAN" : classYears[Math.floor(Math.random() * classYears.length)],
    grade: overall,
    ratings,
    history: []
  };
}

function generateRoster() {
  team = [];
  positions.forEach(pos => team.push(generatePlayer(false, pos)));
}

function generateRecruits() {
  recruits = [];
  const recruitPositions = positions.slice(0, 9);
  recruitPositions.forEach(pos => recruits.push(generatePlayer(true, pos)));
}

function createPlayerCard(player, isRecruit = false, index = -1) {
  const card = document.createElement("div");
  card.className = "player-card" + (isRecruit ? " recruit" : "");
  const ratingsHtml = Object.entries(player.ratings)
    .map(([k, v]) => `<div>${k} <span style="float:right">${v}</span></div>`).join("");
  card.innerHTML = `
    <div class="name">${player.name}</div>
    <div class="info">${player.pos} - ${player.class} - Grade: <strong>${player.grade}</strong></div>
    <div class="ratings">${ratingsHtml}</div>
  `;
  if (isRecruit) {
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "select";
    checkbox.dataset.index = index;
    checkbox.addEventListener("change", limitSelection);
    card.appendChild(checkbox);
  }
  return card;
}

function renderRoster() {
  const container = document.getElementById("roster");
  container.innerHTML = "";
  team.forEach(player => container.appendChild(createPlayerCard(player)));
}

function renderRecruits() {
  const container = document.getElementById("recruits");
  container.innerHTML = "";
  recruits.forEach((player, i) => container.appendChild(createPlayerCard(player, true, i)));
}

function openTeamMenu() {
  document.getElementById("menuOverlay").style.display = "block";
  document.getElementById("teamMenu").style.display = "block";
}
function closeTeamMenu() {
  document.getElementById("menuOverlay").style.display = "none";
  document.getElementById("teamMenu").style.display = "none";
}

function openNewSeasonOverlay() {
  document.getElementById("NewSeasonOverlay").style.display = "flex";
}
function closeNewSeasonOverlay() {
  document.getElementById("NewSeasonOverlay").style.display = "none";

  season++;
  document.getElementById("seasonTitle").textContent =
    `Season ${season} - ${selectedTeamName} Roster`;

  initializeAllTeams();
  leagueSchedule = [];
  seasonSchedule = [];
  currentWeek = 0;
  seasonResults = [];
  generateRecruits();
  renderRoster();
  renderRecruits();

  document.getElementById("seasonSummary").innerHTML = "";
  document.getElementById("depthChart").style.display = "none";
  document.getElementById("top25Rankings").style.display = "none";
  document.getElementById("continue").style.display = "none";
  document.getElementById("submitRecruitsButton").style.display = "block";
  document.getElementById("message").innerHTML = "";}

function showRosterStats() {
  const avg = team.reduce((a,b)=>a+(gradeValues[b.grade]||2.0),0)/team.length;
  alert(`📈 Team Average Rating: ${numericToGrade(avg)} (${avg.toFixed(2)})`);
}

function limitSelection() {
  const checkboxes = document.querySelectorAll(".select");
  const checked = Array.from(checkboxes).filter(cb => cb.checked);
  const pickedPositions = checked.map(cb => recruits[cb.dataset.index].pos);
  checkboxes.forEach(cb => {
    const recruit = recruits[cb.dataset.index];
    const isChecked = cb.checked;
    const positionAlreadyPicked = pickedPositions.includes(recruit.pos);
    const anotherOfSamePosition = positionAlreadyPicked && !isChecked;
    cb.disabled = ((checked.length >= 5 && !isChecked) || anotherOfSamePosition);
  });
}

function initializeAllTeams() {
    allTeamsData = [];
    Object.values(conferences).flat().forEach(name => {
        allTeamsData.push({
            name,
            strength: 1.0 + Math.random() * 3.0,
            wins: 0,
            losses: 0
        });
    });
}

function rankTeams() {

    allTeamsData.forEach(team => {
        team.pollScore = (team.wins * 2) + team.strength;
    });

    allTeamsData.sort((a, b) => b.pollScore - a.pollScore);
}

function renderTop25() {
  const title = currentWeek === 0
    ? "Preseason Top 25 Poll"
    : currentWeek >= SEASON_WEEKS
      ? "Final Top 25 Poll"
      : `Week ${currentWeek} Top 25 Poll`;
  let rankingHTML = `<strong>🏆 ${title}</strong><br><br>`;
  const preFormatted = [];

  for (let i = 0; i < 25; i++) {
    const team = allTeamsData[i];
    const rank = (i + 1).toString().padStart(2, " ");
    preFormatted.push(`${rank}. ${team.name} (${team.wins}-${team.losses})`);
  }

  rankingHTML += preFormatted.join("\n");
  document.getElementById("top25Rankings").innerHTML = rankingHTML;
}

function submitRecruits() {
  const selected = Array.from(document.querySelectorAll(".select:checked"));
  let signed = [];
  selected.forEach(cb => {
    const idx = cb.dataset.index;
    const recruit = recruits[idx];
    const chance = selected.length === 1 ? 0.95 : selected.length === 2 ? 0.91 : selected.length === 3 ? 0.87 : 0.81;
    if (Math.random() < chance) signed.push(recruit);
  });

  team.forEach(p => {
    if (p.class === "SENIOR") {
      careerHistory.push({ name: p.name, pos: p.pos, finalGrade: p.grade, seasons: p.history });
    }
  });

  team = team.filter(p => p.class !== "SENIOR");
  team.forEach(p => {
    const nextClass = classYears[classYears.indexOf(p.class) + 1];
    p.class = nextClass || "SENIOR";
  });

  team.forEach(player => {
    const attrs = positionAttributes[player.pos];
    attrs.forEach(attr => {
      let val = gradeValues[player.ratings[attr]];
      val += Math.random() * 0.3;
      if (val > 4.0) val = 4.0;
      player.ratings[attr] = numericToGrade(val);
    });
    player.grade = calculateOverallWeighted(player.ratings, player.pos);
  });

  signed.forEach(newPlayer => {
    newPlayer.history = [`Year ${season} - FRESHMAN`];
    const existingIndex = team.findIndex(p => p.pos === newPlayer.pos);
    if (existingIndex !== -1) team[existingIndex] = newPlayer;
    else team.push(newPlayer);
  });

  positions.forEach(pos => {
    if (!team.some(p => p.pos === pos)) {
      const walkOn = generatePlayer(true, pos);
      walkOn.name += " (Walk-on)";
      team.push(walkOn);
    }
  });

  const teamTalent = team.reduce((sum, p) => sum + (gradeValues[p.grade] || 2.0), 0);
  const teamStrength = teamTalent / team.length;
  
  const userTeamData = allTeamsData.find(t => t.name === selectedTeamName);
  if(userTeamData) {
      userTeamData.strength = teamStrength;
  }

  document.getElementById("message").innerHTML =
    `Recruits Signed:<br>➡️ ${signed.map(p => p.name).join("<br>➡️ ") || "None"}`;
  
  startSeason(teamStrength);
  renderRoster();
  document.getElementById("submitRecruitsButton").style.display = "none";
  document.getElementById("simulateWeek").style.display = "block";
}

function playNextWeek() {
  const game = simulateWeek(); 
  if (!game) return;

  rankTeams();
  renderTop25();
  document.getElementById("top25Rankings").style.display = "block";

  const userTeamData = allTeamsData.find(t => t.name === selectedTeamName);
  const wins = userTeamData.wins;
  const losses = userTeamData.losses;

  document.getElementById("seasonSummary").innerHTML =
    `<strong>Season ${season} — Week ${currentWeek}/12</strong><br>
     Record: ${wins}-${losses}<br><br>` +
    seasonResults.map(g =>
      `Week ${g.week}: vs. ${g.opponentRank ? `#${g.opponentRank} ` : ""}${g.opponent} — ${g.result}`
    ).join("<br>");

  if (currentWeek === 12) {
    finishSeason(wins, losses);
  }
}

function finishSeason(wins, losses) {
  rankTeams();

  const rank = allTeamsData.findIndex(t => t.name === selectedTeamName) + 1;
  let result = "";

  if (rank === 1) result = "🏆 You won the National Championship!";
  else if (rank <= 12) result = "You made the NCAA Playoffs!";
  else if (wins >= 6) result = "🎉 You made a Bowl Game!";
  else result = "😢 Missed the postseason.";

  document.getElementById("seasonSummary").innerHTML +=
    `<br><br><strong>Final record: ${wins}-${losses}</strong><br>
     Final rank: #${rank}<br>
     ${result}`;

  document.getElementById("depthChart").style.display = "block";
  document.getElementById("top25Rankings").style.display = "block";
  renderDepthChart();
  renderTop25();

  document.getElementById("simulateWeek").style.display = "none";
  document.getElementById("continue").style.display = "block";
}

function renderDepthChart() {
  const output = team
    .sort((a, b) => positions.indexOf(a.pos) - positions.indexOf(b.pos))
    .map(p => `${p.pos}: ${p.name} (${p.class}, ${p.grade})`)
    .join("\n");
  document.getElementById("depthChart").innerText = `📊 Depth Chart\n\n${output}`;
}

// Initial game start
initializeAllTeams();
generateRoster();
generateRecruits();
renderRoster();
renderRecruits();


function confirmTeamSelection() {
  const dropdown = document.getElementById("teamDropdown");
  const choice = dropdown.value;

  if (!choice) {
    alert("Please select a team.");
    return;
  }

  selectedTeamName = choice;
  selectedTeamConference = Object.keys(conferences).find(conf =>
    conferences[conf].includes(selectedTeamName)
  );

  document.getElementById("seasonTitle").textContent = `Season ${season} - ${selectedTeamName} Roster`;
  document.getElementById("teamSelectorModal").style.display = "none";
  document.getElementById("teamSelectorOverlay").style.display = "none";
}
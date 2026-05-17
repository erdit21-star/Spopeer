async function loadSportsStrip() {
  const track = document.getElementById("sportsTrack");
  if (!track) return;

  try {
    const res = await fetch("data/list-of-sports.txt", {
      headers: { "Accept": "text/plain" }
    });

    if (!res.ok) {
      throw new Error(`Sports list request failed with ${res.status}`);
    }

    const text = await res.text();

    // Reject accidental HTML fallback
    if (
      /<!DOCTYPE html/i.test(text) ||
      /<html/i.test(text) ||
      /<body/i.test(text) ||
      /<img/i.test(text)
    ) {
      throw new Error("Sports list returned HTML instead of plain text");
    }

    const sports = text
      .split(/\r?\n/)
      .map(s => s.trim())
      .filter(Boolean)
      .filter(s => !/[<>]/.test(s))
      .slice(0, 1000);

    const sportIconMap = [
      { match: /(football|soccer|futsal|arena football|gaelic football|american football|rugby)/i, icon: "fa-futbol" },
      { match: /(basketball|slamball)/i, icon: "fa-basketball" },
      { match: /(tennis|padel|racquetball|squash|badminton|table tennis|racketlon)/i, icon: "fa-table-tennis-paddle-ball" },
      { match: /(swim|aquathlon|diving)/i, icon: "fa-person-swimming" },
      { match: /(run|marathon|athletics|decathlon|heptathlon|duathlon)/i, icon: "fa-person-running" },
      { match: /(cycling|bicycl|mountain biking|road cycling)/i, icon: "fa-person-biking" },
      { match: /(baseball|softball|cricket)/i, icon: "fa-baseball-bat-ball" },
      { match: /(hockey|floorball|roller hockey|inline hockey|ice hockey)/i, icon: "fa-hockey-puck" },
      { match: /(volleyball|beach volleyball|footvolley|bossaball)/i, icon: "fa-volleyball" },
      { match: /(golf|disc golf|frisbee golf|speed golf)/i, icon: "fa-golf-ball-tee" },
      { match: /(boxing|wrestling|judo|jiu-jitsu|karate|taekwondo|kickboxing|martial arts|kung fu|kendo|krav maga|sambo|hapkido|capoeira)/i, icon: "fa-hand-fist" },
      { match: /(ski|snow|skating|skateboard|snowboard|sled|skeleton)/i, icon: "fa-person-skiing" },
      { match: /(rowing|canoe|boat|sailing|dragon boat)/i, icon: "fa-water" },
      { match: /(horse|equestrian|polo|horseball|vaulting)/i, icon: "fa-horse" },
      { match: /(fitness|crossfit|bodybuilding|powerlifting|calisthenics|insanity)/i, icon: "fa-dumbbell" },
      { match: /(archery|shooting)/i, icon: "fa-bullseye" },
      { match: /(climbing|hiking|mountain climbing|caving|canyoning|parkour)/i, icon: "fa-mountain" },
      { match: /(chess|mahjong|backgammon|shogi)/i, icon: "fa-chess" },
      { match: /(motorsport|formula one|kart|racing|speedway|jet ski|snowmobile)/i, icon: "fa-flag-checkered" },
      { match: /(fishing|angling|spearfishing)/i, icon: "fa-fish" }
    ];

    function iconForSport(name) {
      const found = sportIconMap.find(item => item.match.test(name));
      return found ? found.icon : "fa-medal";
    }

    function createChip(sport) {
      const chip = document.createElement("div");
      chip.className = "sport-chip";

      const icon = document.createElement("i");
      icon.className = `fa-solid ${iconForSport(sport)}`;

      chip.appendChild(icon);
      chip.appendChild(document.createTextNode(sport));

      return chip;
    }

    track.innerHTML = "";

    const fragment = document.createDocumentFragment();
    const doubledSports = [...sports, ...sports];

    doubledSports.forEach((sport) => {
      fragment.appendChild(createChip(sport));
    });

    track.appendChild(fragment);
  } catch (err) {
    console.error("Failed to load sports list:", err);

    const fallbackSports = [
      "Football",
      "Basketball",
      "Tennis",
      "Running",
      "Swimming",
      "Cycling",
      "Volleyball",
      "Boxing"
    ];

    track.innerHTML = "";

    const fragment = document.createDocumentFragment();

    function fallbackIconForSport(name) {
      if (/football|soccer|rugby/i.test(name)) return "fa-futbol";
      if (/basketball/i.test(name)) return "fa-basketball";
      if (/tennis/i.test(name)) return "fa-table-tennis-paddle-ball";
      if (/running/i.test(name)) return "fa-person-running";
      if (/swimming/i.test(name)) return "fa-person-swimming";
      if (/cycling/i.test(name)) return "fa-person-biking";
      if (/volleyball/i.test(name)) return "fa-volleyball";
      if (/boxing/i.test(name)) return "fa-hand-fist";
      return "fa-medal";
    }

    [...fallbackSports, ...fallbackSports].forEach((sport) => {
      const chip = document.createElement("div");
      chip.className = "sport-chip";

      const icon = document.createElement("i");
      icon.className = `fa-solid ${fallbackIconForSport(sport)}`;

      chip.appendChild(icon);
      chip.appendChild(document.createTextNode(sport));
      fragment.appendChild(chip);
    });

    track.appendChild(fragment);
  }
}

loadSportsStrip();

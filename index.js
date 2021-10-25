import dotenv from 'dotenv';
import{ promises as fs } from 'fs';
import fetch from 'node-fetch';
import { parse  } from 'json2csv';
import path from 'path';
const __dirname = path.dirname(new URL(import.meta.url).pathname);
import moment from 'moment';

dotenv.config();

const { userID, token } = await fetch("https://api-7.whoop.com/oauth/token", {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
    },
    body: JSON.stringify({
        "grant_type": "password",
        username: process.env.USERNAME,
        password: process.env.PASSWORD,
    })
}).then(res => res.json()).then(json => {
    return {
        userID: json.user.id,
        token: json.access_token
    }
});

const res = await fetch(`https://api-7.whoop.com/users/${userID}/cycles?start=2000-01-01T00:00:00.000Z&end=2030-01-01T00:00:00.000Z`, {
    headers: {
        "Authorization": `Bearer ${token}`
    }
}).then(res => res.json())

let workouts = [];

const cycles = res.map(cycle => {
    cycle.strain.workouts.forEach(workout => {
        workouts.push({
            date: cycle.days[0],
            length: moment(workout.during.upper).diff(moment(workout.during.lower), 'minutes'),
            avgHR: workout.averageHeartRate,
            strain: workout.cumulativeWorkoutStrain,
            maxHR: workout.maxHeartRate,
            calories: workout.kilojoules / 4.184,
            sport: workout.sportId,
            hr5060: workout.zones[0] / 1000 / 60,
            hr6070: workout.zones[1] / 1000 / 60,
            hr7080: workout.zones[2] / 1000 / 60,
            hr8090: workout.zones[3] / 1000 / 60,
            hr90100: workout.zones[4] / 1000 / 60, 
        })
    })
    return {
        date: cycle.days[0],
        strain: cycle.strain.score,
        recovery: cycle.recovery?.score,
        HRV: cycle.recovery?.heartRateVariabilityRmssd * 1000,
        sleepDuration: cycle.sleep.qualityDuration / 1000 / 60 / 60,
        remDuration: cycle.sleep.sleeps[0]?.remSleepDuration / 1000 / 60 / 60,
        swsDuration: cycle.sleep.sleeps[0]?.slowWaveSleepDuration / 1000 / 60 / 60,
        lightDuration: cycle.sleep.sleeps[0]?.lightSleepDuration / 1000 / 60 / 60,
        sleepStart: moment(cycle.sleep.sleeps[0]?.during.lower).format("HH:mm"),
        sleepEnd: moment(cycle.sleep.sleeps[0]?.during.upper).format("HH:mm"),
        respiratioryRate: cycle.sleep.sleeps[0]?.respiratoryRate,
        avgHR: cycle.strain.averageHeartRate,
        calories: cycle.strain.kilojoules / 4.184,
    }
})

await Promise.all([
        fs.writeFile(
            path.join(__dirname, "cycles.csv"), 
            parse(cycles, {})
        ),
        fs.writeFile(
            path.join(__dirname, "workouts.csv"), 
            parse(workouts, {})
        )
    ]
)



console.log("Data saved to ./cycles.csv and ./workouts.csv");

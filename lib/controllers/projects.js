"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const config = require("../config");
const DEFAULT_IMAGE = "data:image/png;base64," +
    "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABGdBTUEAAK/INwWK6QAAABl0RVh0U" +
    "29mdHdhcmUAQWRvYmUgSW1hZ2VSZWFkeXHJZTwAAAI4SURBVDjLhVPNaxNREJ8k2yxuDMGEkGi0Ql" +
    "tREC9+HQQPKl5EkBz8D7xI/QDxIh4KpeA5lII3IbeAF6UKHjU5SS2op1JKTFiN5GOD6WY/s/t8M5u" +
    "3bkvBWWZneJn3m99vdhJrNBqrjLEH3MH3fRBRuOd55NN8qVwuL0PU6vX6N13X2f+s3++zWq1WxwZR" +
    "lxAZbf37CBiP/IzcxwL4l1+bZcRkvxGAG2DAscxMAIAPRaBXS3NIguu6VNdefHoPDPP97Ku1X1KAy" +
    "nXzwuGuBdudMSiHkmHnoxmJxwRdnEwm0L7/5HkK3BV9bGzwo0uBhKmeTEqGCwvyHimYDwcBgxPq7y" +
    "KMjTe2Y68cjnsXf1y/s0gMEjEAj1e2h+4e/X5kHv6Xr3C+rS7ounHbNa3HcpJVYGw+JADsfuuMHGo" +
    "k6VNWaMmkDNrnFEx2deAMXpz88DrWvHyzApZ1WkJdwhzHgW63C5qmEeVsNgv5fJ4D8JkguGEBGxtB" +
    "sWECs20gAPEp8bKqquFC8f2gPJ1Og692QHIdYIb1rHn2yqO0IsHoj70VFwywcDAYUCyVSuQI0uv1K" +
    "MZuXIVP2SM7YJrrM75XYY4NYNmr8agE0VloF/MRM9mcP95hln1XTjAY/RxuzPW21iQcnJCAmpF2q9" +
    "UKgfBMAGCzuebm0k7uVAecyVvaxCgDHBh25XtPF3K5HBSLxRBAfKX5wfbLcJXxEH9UFIW8UCjAQYY" +
    "1B/4XOIOP1Wr1HDLBgmgUecTf7Qf4C2kj+HVimC2aAAAAAElFTkSuQmCC";
let dataConnection;
function setup(newDataConnection) {
    dataConnection = newDataConnection;
}
exports.setup = setup;
function getProjects(startIndex, count, callback) {
    // get data from Projects table
    dataConnection.query("SELECT id, title, subtitle FROM Projects ORDER BY id LIMIT ? OFFSET ?", [count < 0 ? 200 : count, startIndex])
        .then(rows => {
        // convert from SQL row to ProjectOverview[]
        let response = [];
        for (let project of rows) {
            response.push({
                id: project.id,
                title: project.title,
                subtitle: project.subtitle,
                imageUri: "/api/v1/projects/" + project.id + "/image"
            });
        }
        // return response
        callback({
            httpCode: 200,
            response: response
        });
    })
        .catch(() => {
        // 500 error if SQL issue
        callback({
            httpCode: 500
        });
    });
}
exports.getProjects = getProjects;
function createProject(project, callback) {
    let projectId = null;
    dataConnection.query("INSERT INTO Projects (title, subtitle, description, imageData, target) VALUES (?, ?, ?, ?, ?);" +
        "SELECT LAST_INSERT_ID();", [project.title, project.subtitle, project.description, DEFAULT_IMAGE, project.target])
        .then(rows => {
        projectId = rows[1][0]["LAST_INSERT_ID()"];
        let query = "";
        let queryData = [];
        for (let creator of project.creators) {
            query += "INSERT INTO ProjectCreators (project_id, user_id) VALUES (?, ?);";
            queryData.push(projectId, creator.id);
        }
        for (let reward of project.rewards) {
            query += "INSERT INTO Rewards (project_id, amount, description) VALUES (?, ?, ?);";
            queryData.push(projectId, reward.amount, reward.description);
        }
        return dataConnection.query(query, queryData);
    })
        .then(() => {
        callback({
            httpCode: 201,
            response: projectId
        });
    })
        .catch(() => {
        callback({
            httpCode: 500
        });
    });
}
exports.createProject = createProject;
function getProject(id, callback) {
    // multiple queries because we need a lot of data
    dataConnection.query(
    // get project information, including number of backers and sum of backer amount
    "SELECT Projects.title, Projects.subtitle, Projects.description, Projects.target, Projects.creationDate, COUNT(Backers.user_id), SUM(Backers.amount) " +
        "FROM Projects " +
        "INNER JOIN Backers ON Backers.project_id = Projects.id " +
        "WHERE id = ?; " +
        // get id, username of the project creators
        "SELECT Users.id, Users.username " +
        "FROM ProjectCreators " +
        "INNER JOIN Users ON Users.id = ProjectCreators.user_id " +
        "WHERE ProjectCreators.project_id = ?; " +
        // get reward descriptions
        "SELECT Rewards.id, Rewards.amount, Rewards.description " +
        "FROM Rewards " +
        "WHERE Rewards.project_id = ?; " +
        // get all backers for the project
        "SELECT Users.id, Backers.amount, Backers.private " +
        "FROM Backers " +
        "INNER JOIN Users ON Users.id = Backers.user_id " +
        "WHERE Backers.project_id = ?;", [id, id, id, id])
        .then(rows => {
        // 404 error if project id doesn't exist
        if (rows[0].length === 0) {
            callback({
                httpCode: 404
            });
        }
        else {
            // convert from sql data to json data
            const projectSql = rows[0][0];
            const creatorsSql = rows[1];
            const rewardsSql = rows[2];
            const backersSql = rows[3];
            let creators = [];
            for (let creator of creatorsSql) {
                creators.push({
                    id: creator.id,
                    name: creator.username
                });
            }
            let rewards = [];
            for (let reward of rewardsSql) {
                rewards.push({
                    id: reward.id,
                    amount: reward.amount,
                    description: reward.description
                });
            }
            let backers = [];
            for (let backer of backersSql) {
                if (backer.private === 0) {
                    backers.push({
                        name: backer.id,
                        amount: backer.amount
                    });
                }
            }
            // return response
            callback({
                httpCode: 200,
                response: {
                    project: {
                        id: id,
                        creationDate: projectSql.creationDate.getTime(),
                        data: {
                            title: projectSql.title,
                            subtitle: projectSql.subtitle,
                            description: projectSql.description,
                            imageUri: `/api/v1/projects/${id}/image`,
                            target: projectSql.target,
                            creators: creators,
                            rewards: rewards
                        }
                    },
                    progress: {
                        target: projectSql.target,
                        currentPledged: projectSql["SUM(Backers.amount)"],
                        numberOfBackers: projectSql["COUNT(Backers.user_id)"]
                    },
                    backers: backers
                }
            });
        }
    })
        .catch(() => {
        // 500 error if SQL error
        callback({
            httpCode: 500
        });
    });
}
exports.getProject = getProject;
function updateProject(id, open, callback) {
    dataConnection.query("UPDATE Projects SET isOpen=? WHERE id=?", [open, id])
        .then(() => {
        callback(201);
    })
        .catch(() => {
        callback(500);
    });
}
exports.updateProject = updateProject;
function getRewards(id, callback) {
    // get all reward data for a project
    dataConnection.query("SELECT Rewards.id, Rewards.amount, Rewards.description " +
        "FROM Rewards " +
        "WHERE Rewards.project_id = ?", [id])
        .then(rows => {
        // convert from SQL format to JSON format
        let rewards = [];
        for (let reward of rows) {
            rewards.push({
                id: reward.id,
                amount: reward.amount,
                description: reward.description
            });
        }
        // return response
        callback({
            httpCode: 200,
            response: rewards
        });
    })
        .catch(() => {
        // return 500 Error if SQL error
        callback({
            httpCode: 500
        });
    });
}
exports.getRewards = getRewards;
function updateRewards(id, rewards, callback) {
    let query = "DELETE FROM Rewards WHERE project_id=?;";
    let data = [id];
    for (let reward of rewards) {
        query += "INSERT INTO Rewards (project_id, amount, description) VALUES (?, ?, ?);";
        data.push(id, reward.amount, reward.description);
    }
    dataConnection.query(query, data)
        .then(rows => {
        callback(201);
    })
        .catch(() => {
        callback(500);
    });
}
exports.updateRewards = updateRewards;
function getImage(id, callback) {
    dataConnection.query("SELECT imageData FROM Projects WHERE id=?", [id])
        .then(rows => {
        if (rows.length === 0) {
            // return 404 if project not found
            callback({
                httpCode: 404
            });
        }
        else {
            // stored in the database as data:image/png;base64,BASE64 PNG DATA
            let image = rows[0].imageData;
            let match = image.match(/^data:([^,;]+);base64,(.+)$/);
            if (match === null) {
                // 500 if unable to extract data from image. This shouldn't happen.
                console.log(`Regex for getting image for project id: ${id} has failed`);
                callback({
                    httpCode: 500
                });
            }
            else {
                // return the image
                let type = match[1];
                let data = match[2];
                callback({
                    httpCode: 200,
                    type: type,
                    response: new Buffer(data, "base64")
                });
            }
        }
    })
        .catch(() => {
        // return 500 if SQL Error
        callback({
            httpCode: 500
        });
    });
}
exports.getImage = getImage;
function base64_encode(file) {
    // read binary data
    const bitmap = fs_1.readFileSync(file);
    // convert binary data to base64 encoded string
    return new Buffer(bitmap).toString('base64');
}
function updateImage(id, image, callback) {
    const str = "data:" + image.mimetype + ";base64," + base64_encode(config.uploadDirectory + image.filename);
    dataConnection.query("UPDATE Projects SET imageData=? WHERE id=?", [str, id])
        .then(() => {
        callback(201);
    })
        .catch(() => {
        callback(500);
    });
}
exports.updateImage = updateImage;
function submitPledge(id, token, pledge, callback) {
    dataConnection.query("INSERT INTO Backers (project_id, user_id, amount, private) VALUES (?, ?, ?, ?)", [id, token.id, pledge.amount, pledge.anonymous])
        .then(rows => {
        callback(200);
    })
        .catch(() => {
        callback(500);
    });
}
exports.submitPledge = submitPledge;
//# sourceMappingURL=projects.js.map
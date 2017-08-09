const http = require('http');
const protocol = "http:";
const hostname = "localhost";
const port = 4941;
const apiPath = "/api/v1/";

function isObject(value) {
    return typeof value === "object" && value !== null;
}

function objectHasInteger(object, field) {
    if (!(field in object))
        return false;

    return Number.isInteger(object[field]);
}

function objectHasString(object, field) {
    if (!(field in object))
        return false;

    return typeof object[field] === "string";
}

function objectHasObject(object, field) {
    if (!(field in object))
        return false;

    return isObject(object[field]);
}

function objectHasArray(object, field) {
    if (!(field in object))
        return false;

    return Array.isArray(object[field]);
}

function extractData(response, callback) {
    let rawData = '';
    response.on('data', chunk => { rawData += chunk; });
    response.on('end', () => {
        callback(rawData);
    });
}

function testGet(test, url, headers, callback) {
    http.request({
        protocol: protocol,
        hostname: hostname,
        port: port,
        path: apiPath + url,
        method: "GET",
        headers: headers
    }, response => {
        callback(response);
    }).on('error', e => {
        test.fail();
        test.done();
    }).end();
}

function testPost(test, url, headers, callback) {
    http.request({
        protocol: protocol,
        hostname: hostname,
        port: port,
        path: apiPath + url,
        method: "POST",
        headers: headers
    }, response => {
        callback(response);
    }).on('error', e => {
        test.fail();
        test.done();
    }).end();
}

function testJson(test, url, headers, callback) {
    testGet(test, url, headers, response => {
        const statusCode = response.statusCode;
        test.equal(statusCode, 200);

        const contentType = response.headers['content-type'];
        test.ok(/^application\/json/.test(contentType));

        response.setEncoding('utf8');
        extractData(response, data => {
            callback(JSON.parse(data));
        });
    });
}

function testImage(test, url, headers, callback) {
    testGet(test, url, headers, response => {
        const statusCode = response.statusCode;
        test.equal(statusCode, 200);

        const contentType = response.headers['content-type'];
        test.ok(/^image\/png/.test(contentType) ||
            /^image\/jpeg/.test(contentType));

        extractData(response, callback);
    });
}

function testHttp(test, url, headers, expectedStatusCode, callback) {
    testGet(test, url, headers, response => {
        const statusCode = response.statusCode;
        test.equal(statusCode, expectedStatusCode);
        callback();
    });
}

function equals(lhs, rhs) {
    if (!Array.isArray(lhs))
        throw new Error();
    if (!Array.isArray(rhs))
        throw new Error();

    if (lhs.length !== rhs.length)
        return false;

    for (let i in lhs) {
        let lhsValue = lhs[i];
        let rhsValue = rhs[i];

        if (!isObject(lhsValue))
            return false;
        if (!isObject(rhsValue))
            return false;

        if (lhsValue.id !== rhsValue.id)
            return false;
        if (lhsValue.title !== rhsValue.title)
            return false;
        if (lhsValue.subtitle !== rhsValue.subtitle)
            return false;
        if (lhsValue.imageUri !== rhsValue.imageUri)
            return false;
    }

    return true;
}


exports.testProjects = function(test) {
    testJson(test, "projects", {}, json => {
        test.ok(Array.isArray(json));

        for (let value of json) {
            test.ok(isObject(value));

            test.ok(objectHasInteger(value, "id"));
            test.ok(objectHasString(value, "title"));
            test.ok(objectHasString(value, "subtitle"));
            test.ok(objectHasString(value, "imageUri"));
        }

        test.done();
    });
};

exports.testProjectsAdvanced = function(test) {
    testJson(test, "projects", {}, json => {

        testJson(test, "projects?startIndex=1&count=4", {}, function(smallJson) {
            test.ok(equals(smallJson, json.slice(1, 5)));

            testJson(test, "projects?startIndex=15&count=1", {}, function(smallJson) {
                test.ok(equals(smallJson, json.slice(15, 16)));

                testJson(test, "projects?startIndex=1000000000&count=1", {}, function(smallJson) {
                    test.ok(smallJson.length === 0);
                    test.done();
                });
            });
        });
    });
};

exports.testProjectsCreate = function(test) {
    test.fail();
    test.done();
};

exports.testProjectsId = function(test) {
    // Assume 1 is always a valid id
    testJson(test, "projects/1", {}, json => {
        test.ok(isObject(json));
        test.ok(objectHasObject(json, "project"));
        test.ok(objectHasObject(json, "progress"));
        test.ok(objectHasArray(json, "backers"));

        const project = json.project;
        test.ok(objectHasInteger(project, "id"));
        test.ok(objectHasInteger(project, "creationDate"));
        test.ok(objectHasObject(project, "data"));

        const projectData = project.data;
        test.ok(objectHasString(projectData, "title"));
        test.ok(objectHasString(projectData, "subtitle"));
        test.ok(objectHasString(projectData, "description"));
        test.ok(objectHasString(projectData, "imageUri"));
        test.ok(objectHasInteger(projectData, "target"));
        test.ok(objectHasArray(projectData, "creators"));
        test.ok(objectHasArray(projectData, "rewards"));

        const projectCreators = projectData.creators;
        for (let projectCreator of projectCreators) {
            test.ok(isObject(projectCreator));
            test.ok(objectHasInteger(projectCreator, "id"));
            test.ok(objectHasString(projectCreator, "name"));
        }

        const projectRewards = projectData.rewards;
        for (let projectReward of projectRewards) {
            test.ok(isObject(projectReward));
            test.ok(objectHasInteger(projectReward, "id"));
            test.ok(objectHasInteger(projectReward, "amount"));
            test.ok(objectHasString(projectReward, "description"));
        }

        const progress = json.progress;
        test.ok(objectHasInteger(progress, "target"));
        test.ok(objectHasInteger(progress, "currentPledged"));
        test.ok(objectHasInteger(progress, "numberOfBackers"));

        const backers = json.backers;
        for (let backer of backers) {
            test.ok(isObject(backer));
            test.ok(objectHasString(backer, "name"));
            test.ok(objectHasInteger(backer, "amount"));
        }

        testHttp(test, "projects/ham", {}, 404, function() {
            test.done();
        });
    });
};

exports.testProjectsModify = function(test) {
    test.fail();
    test.done();
};

exports.testProjectsImage = function(test) {
    testImage(test, "projects/1/image", {}, function() {
        test.done();
    });
};

exports.testProjectsModifyImage = function(test) {
    test.fail();
    test.done();
};

exports.testProjectsSubmitPledge = function(test) {
    test.fail();
    test.done();
};

exports.testProjectsGetRewards = function(test) {
    testJson(test, "projects/1/rewards", {}, function(json) {
        test.ok(Array.isArray(json));

        for (let reward of json) {
            test.ok(isObject(reward));

            test.ok(objectHasInteger(reward, "id"));
            test.ok(objectHasInteger(reward, "amount"));
            test.ok(objectHasString(reward, "description"));
        }

        test.done();
    });
};

exports.testProjectsPutRewards = function(test) {
    test.fail();
    test.done();
};

exports.testUsersCreateDelete = function(test) {
    test.fail();
    test.done();
};

exports.testUsersLoginLogout = function(test) {
    testPost(test, 'users/login?username=dclemett0&password=secret', {}, response => {
        const statusCode = response.statusCode;
        test.equal(statusCode, 200);

        const contentType = response.headers['content-type'];
        test.ok(/^application\/json/.test(contentType));

        response.setEncoding('utf8');
        extractData(response, data => {
            const json = JSON.parse(data);

            objectHasInteger(json, "id");
            objectHasString(json, "token");

            const token = json.token;

            testJson(test, 'users/login_status', { "x-authorization": token }, json => {
                test.strictEqual(json, true);

                // Token login resolution is 1s, so wait at least 1s before logging out.
                setTimeout(() => {
                    testPost(test, 'users/logout', { "x-authorization": token }, response => {
                        const statusCode = response.statusCode;
                        test.equal(statusCode, 200);

                        const contentType = response.headers['content-type'];
                        test.ok(/^application\/json/.test(contentType));

                        testJson(test, 'users/login_status', { "x-authorization": token }, json => {
                            test.strictEqual(json, false);
                            test.done();
                        });
                    });
                }, 1000);
            });
        });
    });
};

exports.testUsersGet = function(test) {
    // Assume 1 is always a valid id
    testJson(test, "users/1", {}, json => {
        test.ok(isObject(json));
        test.ok(objectHasInteger(json, "id"));
        test.ok(objectHasString(json, "username"));
        test.ok(objectHasString(json, "location"));
        test.ok(objectHasString(json, "email"));

        testHttp(test, "users/ham", {}, 404, function() {
            test.done();
        });
    });
};

exports.testUsersUpdate = function(test) {
    test.fail();
    test.done();
};
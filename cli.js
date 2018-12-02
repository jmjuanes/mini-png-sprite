//Import dependencies
let fs = require("fs");
let path = require("path");
let Sprite = require("./index.js");

//Import arguments
let options = require("get-args")().options;

//Get all PNG files in a directory
let listPNGFiles = function (folder, callback) {
    return fs.readdir(folder, "utf8", function (error, files) {
        if (error) {
            return callback(error, []);
        }
        //Filter the files list and cll the callback
        return callback(null, files.filter(function (file) {
            return path.extname(file) === ".png";
        }));
    });
};

//Display log message
let log = function (message) {
    if (typeof options.debug === "boolean" && options.debug === true) {
        return console.log(message);
    }
};

//Display an error in console
let logError = function (error) {
    console.error(error.message);
    return process.exit(1);
};

//Generate the sprites
process.nextTick(function () {
    //Check the input png folder or the output png file
    if (typeof options["inputPNGFolder"] !== "string" || typeof options["outputPNGFile"] !== "string") {
        return logError(new Error("No input PNG folder or output PNG file provided"));
    }
    //Initialize the new png sprite object
    let sprite = new Sprite();
    //Compile PNG images
    let compilePNGImages = function () {
        //Generate the sprite
        return sprite.generate(function (error, output) {
            //Check for error generating the PNG sprite
            if (error) {
                return logError(error);
            }
            //Save the PNG file to the output png file
            let outputPNGPath = path.resolve(process.cwd(), options["outputPNGFile"]);
            log("Saving PNG sprite: " + outputPNGPath);
            output.pack().pipe(fs.createWriteStream(outputPNGPath));
            //Check the output css file
            if (typeof options["cssOutput"] === "string") {
                //Get the output CSS path
                let outputCSSPath = path.resolve(process.cwd(), options["cssOutput"]);
                //Initialize the css options
                let cssOptions = {
                    "namespace": options["cssNamespace"],
                    "size": (typeof options["cssIconSize"] === "string") ? parseInt(options["cssIconSize"]) : null 
                };
                //Write the CSS file
                return sprite.generateCSS(cssOptions, function (error, content) {
                    log("Saving CSS file: " + outputCSSPath);
                    return fs.writeFileSync(outputCSSPath, content, "utf8");
                });
            }
            //Done
            return null;
        });
    };
    //Get the input folder path
    let inputPNGFolder = path.resolve(process.cwd(), options["inputPNGFolder"]);
    //List all files on this directory
    return listPNGFiles(inputPNGFolder, function (error, files) {
        if (error) {
            //Display the error and finish the process
            return logError(error);
        }
        //Load all files
        let loadPNGFiles = function (index) {
            if (index >= files.length) {
                return compilePNGImages();
            }
            //Get the image path
            let imagePath = path.join(inputPNGFolder, files[index]);
            log("Loading PNG image: " + imagePath);
            //Load this image
            return sprite.addImage(imagePath, function () {
                return loadPNGFiles(index + 1);
            });
        };
        return loadPNGFiles(0);
    });
});


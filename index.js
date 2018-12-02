//Import dependencies
let fs = require("fs");
let path = require("path");
let PNG = require("pngjs").PNG;
let handlebars = require("handlebars");

//Initialize sprite class
let Sprite = function () {
    //Output image size
    this.width = 0;
    this.height = 0;
    //Images list
    this.images = [];
};

//Add image
Sprite.prototype.addImage = function (imagePath, callback) {
    let self = this;
    return fs.createReadStream(imagePath).pipe(new PNG()).on("parsed", function () {
        //Save the image path
        this.path = imagePath;
        //Save this image to the list of images
        self.images.push(this);
        //Continue
        return callback();
    });
};

//Generate the sprite
Sprite.prototype.generate = function (callback) {
    let self = this;
    //Check the sizes of all images
    for (let i = 0; i < this.images.length; i++) {
        //Check if this image has the same width and height
        if (this.images[i].width !== this.images[i].height) {
            return callback(new Error("All images must have the same width and height"), null);
        }
        //Check if the width of this image is different of the width of the first image
        if (this.images[i].width !== this.images[0].width) {
            return callback(new Error("All images must have the same size"), null);
        }
    }
    //Calculate the png width and height
    this.width = this.images[0].width * this.images.length;
    this.height = this.images[0].height;
    //Initialize the new png image
    let outputImage = new PNG({
        "width": this.width,
        "height": this.height
    });
    //Clean the PNG data
    for (let i = 0; i < outputImage.width * outputImage.height * 4; i++) {
        outputImage.data[i] = 0x00;
    }
    //Copy all images to the output image
    try {
        this.images.forEach(function (img, index) {
            img.bitblt(outputImage, 0, 0, img.width, img.height, img.width * index, 0);
        });
    } catch (error) {
        //Something went wrong adding the images --> exit
        return callback(error, null);
    }
    //Return the png sprite
    return callback(null, outputImage);
};

//Generate CSS Sprite
Sprite.prototype.generateCSS = function (options, callback) {
    let self = this;
    //Parse the css icon size
    if (typeof options.size !== "number") {
        options.size = this.height;
    }
    //Parse the namepsace option
    if (typeof options.namespace !== "string") {
        options.namespace = "sprite";
    }
    //Parse the template path
    if (typeof options.template !== "string") {
        options.template = path.join(__dirname, "templates", "index.css");
    }
    //Read the template file
    return fs.readFile(options.template, "utf8", function (error, cssTemplate) {
        //Check for error
        if (error) {
            return callback(error, null);
        }
        let imageScale = self.height / options.size;
        //Compile the template
        let css = handlebars.compile(cssTemplate);
        //Call the callback function 
        return callback(null, css({
            "width": self.width / imageScale,
            "height": self.height / imageScale,
            "icons": self.images.map(function (img, index) {
                return {
                    "name": path.basename(img.path, ".png"),
                    "position": options.size * index
                };
            }),
            "namespace": options.namespace
        }));
    });
};

//Exports sprites generator
module.exports = Sprite;


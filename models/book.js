const mongoose = require("mongoose");

const bookSchema = new mongoose.Schema({
   title : String,
   isbn : String,
   stock : Number,
   author : String,
   description : String,
   category : String, 
   comments : [{
       type : mongoose.Schema.Types.ObjectId,
       ref : "Comment",
    }],
});

module.exports =  mongoose.model("Book", bookSchema);
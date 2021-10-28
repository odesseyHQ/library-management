// importing dependencies
const fs = require("fs");

// importing models
const Book = require("../models/book");
const User = require("../models/user");
const Activity = require("../models/activity");
const Issue = require("../models/issue");
const Comment = require("../models/comment");

// importing utilities
const deleteImage = require("../utils/delete_image");

// GLOBAL_VARIABLES
const PER_PAGE = 10;

// admin -> show dashboard working procedure
/*
    1. Get user, book and activity count
    2. Fetch all activities in chunk (for pagination)
    3. Render admin/index
*/
exports.getDashboard = async (req, res, next) => {
  var page = req.query.page || 1;
  try {
    const users_count = (await User.find().countDocuments()) - 1;
    const books_count = await Book.find().countDocuments();
    const activity_count = await Activity.find().countDocuments();
    const activities = await Activity.find()
      .sort("-entryTime")
      .skip(PER_PAGE * page - PER_PAGE)
      .limit(PER_PAGE);

    res.render("admin/index", {
      users_count: users_count,
      books_count: books_count,
      activities: activities,
      current: page,
      pages: Math.ceil(activity_count / PER_PAGE),
    });
  } catch (err) {
    console.log(err);
  }
};

// admin -> search activities working procedure
/*
    1. Get user and book count
    2. Fetch activities by search query
    3. Render admin/index
    **pagination is not done
*/
exports.postDashboard = async (req, res, next) => {
  try {
    const search_value = req.body.searchUser;

    // getting user and book count
    const books_count = await Book.find().countDocuments();
    const users_count = await User.find().countDocuments();

    // fetching activities by search query
    const activities = await Activity.find({
      $or: [{ "user_id.username": search_value }, { category: search_value }],
    });

    // rendering
    res.render("admin/index", {
      users_count: users_count,
      books_count: books_count,
      activities: activities,
      current: 1,
      pages: 0,
    });
  } catch (err) {
    console.log(err);
    return res.redirect("back");
  }
};

// admin -> delete profile working procedure
/*
    1. Find admin by user_id and remove
    2. Redirect back to /
*/
exports.deleteAdminProfile = async (req, res, next) => {
  try {
    await User.findByIdAndRemove(req.user._id);
    res.redirect("/");
  } catch (err) {
    console.log(err);
    return res.redirect("back");
  }
};

// admin -> get book inventory working procedure
/*
    1. Construct search object
    2. Fetch books by search object
    3. Render admin/bookInventory
*/
exports.getAdminBookInventory = async (req, res, next) => {
  try {
    let page = req.params.page || 1;
    const filter = req.params.filter;
    const value = req.params.value;

    // console.log(filter, value);
    // // constructing search object
    let searchObj = {};
    if (filter !== "all" && value !== "all") {
      // fetch books by search value and filter
      searchObj[filter] = value;
    }

    // get the book counts
    const books_count = await Book.find(searchObj).countDocuments();

    // fetching books
    const books = await Book.find(searchObj)
      .skip(PER_PAGE * page - PER_PAGE)
      .limit(PER_PAGE);

    // rendering admin/bookInventory
    res.render("admin/bookInventory", {
      books: books,
      current: page,
      pages: Math.ceil(books_count / PER_PAGE),
      filter: filter,
      value: value,
    });
  } catch (err) {
    // console.log(err.messge);
    return res.redirect("back");
  }
};

// admin -> return book inventory by search query working procedure
/*
    same as getAdminBookInventory method
*/
exports.postAdminBookInventory = async (req, res, next) => {
  try {
    let page = req.params.page || 1;
    const filter = req.body.filter.toLowerCase();
    const value = req.body.searchName;

    if (value == "") {
      req.flash(
        "error",
        "Search field is empty. Please fill the search field in order to get a result"
      );
      return res.redirect("back");
    }
    const searchObj = {};
    searchObj[filter] = value;

    // get the books count
    const books_count = await Book.find(searchObj).countDocuments();

    // fetch the books by search query
    const books = await Book.find(searchObj)
      .skip(PER_PAGE * page - PER_PAGE)
      .limit(PER_PAGE);

    // rendering admin/bookInventory
    res.render("admin/bookInventory", {
      books: books,
      current: page,
      pages: Math.ceil(books_count / PER_PAGE),
      filter: filter,
      value: value,
    });
  } catch (err) {
    // console.log(err.message);
    return res.redirect("back");
  }
};

// admin -> get the book to be updated
exports.getUpdateBook = async (req, res, next) => {
  try {
    const book_id = req.params.book_id;
    const book = await Book.findById(book_id);

    res.render("admin/book", {
      book: book,
    });
  } catch (err) {
    console.log(err);
    return res.redirect("back");
  }
};

// admin -> post update book
exports.postUpdateBook = async (req, res, next) => {
  console.log(req.body.book);
  try {
    const description = req.sanitize(req.body.book.description);
    const book_info = req.body.book;
    const book_id = req.params.book_id;

    await Book.findByIdAndUpdate(book_id, book_info);

    const searchObj = {
      "book_info.id": book_id,
    };
    const updates = {
      "book_info.title": req.body.book.title,
      "book_info.author": req.body.book.author,
      "book_info.category": req.body.book.category,
      "book_info.stock": req.body.book.stock
    };
    await Issue.updateMany(searchObj, updates);

    res.redirect("/admin/bookInventory/all/all/1");
  } catch (err) {
    console.log(err);
    res.redirect("back");
  }
};

// admin -> delete book
exports.getDeleteBook = async (req, res, next) => {
  try {
    const book_id = req.params.book_id;

    const book = await Book.findById(book_id);
    await book.remove();

    req.flash("success", `A book named ${book.title} is just deleted!`);
    res.redirect("back");
  } catch (err) {
    console.log(err);
    res.redirect("back");
  }
};

// admin -> get user list
exports.getUserList = async (req, res, next) => {
  try {
    const page = req.params.page || 1;

    const users = await User.find()
      .sort("-joined")
      .skip(PER_PAGE * page - PER_PAGE)
      .limit(PER_PAGE);

    const users_count = await User.find().countDocuments();

    res.render("admin/users", {
      users: users,
      current: page,
      pages: Math.ceil(users_count / PER_PAGE),
    });
  } catch (err) {
    console.log(err);
    res.redirect("back");
  }
};

// admin -> show searched user
exports.postShowSearchedUser = async (req, res, next) => {
  try {
    const page = req.params.page || 1;
    const search_value = req.body.searchUser;

    const users = await User.find({
      $or: [
        { firstName: search_value },
        { lastName: search_value },
        { username: search_value },
        { email: search_value },
      ],
    });

    if (users.length <= 0) {
      req.flash("error", "User not found!");
      return res.redirect("back");
    } else {
      res.render("admin/users", {
        users: users,
        current: page,
        pages: 0,
      });
    }
  } catch (err) {
    console.log(err);
    res.redirect("back");
  }
};

// admin -> flag/unflag user
exports.getFlagUser = async (req, res, next) => {
  try {
    const user_id = req.params.user_id;

    const user = await User.findById(user_id);

    if (user.violationFlag) {
      user.violationFlag = false;
      await user.save();
      req.flash(
        "success",
        `An user named ${user.firstName} ${user.lastName} is just unflagged!`
      );
    } else {
      user.violationFlag = true;
      await user.save();
      req.flash(
        "warning",
        `An user named ${user.firstName} ${user.lastName} is just flagged!`
      );
    }

    res.redirect("/admin/users/1");
  } catch (err) {
    console.log(err);
    res.redirect("back");
  }
};

// admin -> show one user
exports.getUserProfile = async (req, res, next) => {
  try {
    const user_id = req.params.user_id;

    const user = await User.findById(user_id);
    const issues = await Issue.find({ "user_id.id": user_id });
    const comments = await Comment.find({ "author.id": user_id });
    const activities = await Activity.find({ "user_id.id": user_id }).sort(
      "-entryTime"
    );

    res.render("admin/user", {
      user: user,
      issues: issues,
      activities: activities,
      comments: comments,
    });
  } catch (err) {
    console.log(err);
    res.redirect("back");
  }
};

// admin -> show all activities of one user
exports.getUserAllActivities = async (req, res, next) => {
  try {
    const user_id = req.params.user_id;

    const activities = await Activity.find({ "user_id.id": user_id }).sort(
      "-entryTime"
    );
    res.render("admin/activities", {
      activities: activities,
    });
  } catch (err) {
    console.log(err);
    res.redirect("back");
  }
};

// admin -> show activities by category
exports.postShowActivitiesByCategory = async (req, res, next) => {
  try {
    const category = req.body.category;
    const activities = await Activity.find({ category: category });

    res.render("admin/activities", {
      activities: activities,
    });
  } catch (err) {
    console.log(err);
    res.redirect("back");
  }
};

// admin -> add a user
exports.getAddUser = async (req, res, next) => {
  res.render("admin/addUser");
};

exports.postAddUser = async (req, res, next) => {
  if (req.body.username.toString().length != 10) {
    req.flash("error", "Mobile number should have 10 digits");
    return res.render("admin/addUser");
  }

  codeName = req.body.firstName.substring(0, 3).toLowerCase();
  codeNumber = req.body.username.toString().substring(6, 10);
  password = `${codeName}${codeNumber}`;
  console.log(password);

  try {
    const newUser = new User({
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      username: req.body.username,
      email: req.body.email,
      gender: req.body.gender,
      address: req.body.address,
    });

    await User.register(newUser, password);
    req.flash("success", `${req.body.firstName} ${req.body.lastName} added`);
    res.redirect("/admin/users/1");
  } catch (err) {
    console.log(err);
    return res.render("admin/addUser");
  }
};

// admin -> show user to be updated
exports.getUpdateUser = async (req, res, next) => {
  try {
    const user_id = req.params.user_id;
    const user = await User.findById(user_id);

    res.render("admin/updateUser", {
      user: user,
    });
  } catch (err) {
    console.log(err);
    return res.redirect("back");
  }
};

// admin -> update user
exports.postUpdateUser = async (req, res, next) => {
  try {
    const user_info = req.body;
    const user_id = req.params.user_id;

    await User.findByIdAndUpdate(user_id, user_info);

    const searchObj = {
      "user_id.id": user_id,
    };
     const updates = {
      "user_id.userFullName": `${req.body.firstName} ${req.body.lastName}`,
      "user_id.username": req.body.username,
    };
    await Issue.updateMany(searchObj, updates);

    res.redirect("/admin/users/1");
  } catch (err) {
    console.log(err);
    res.redirect("back");
  }
};

// admin -> delete a user
exports.getDeleteUser = async (req, res, next) => {
  try {
    const user_id = req.params.user_id;
    const user = await User.findById(user_id);
    await user.remove();

    let imagePath = `images/${user.image}`;
    if (fs.existsSync(imagePath)) {
      deleteImage(imagePath);
    }

    await Issue.deleteMany({ "user_id.id": user_id });
    await Comment.deleteMany({ "author.id": user_id });
    await Activity.deleteMany({ "user_id.id": user_id });

    res.redirect("/admin/users/1");
  } catch (err) {
    console.log(err);
    res.redirect("back");
  }
};

// admin -> add new book
exports.getAddNewBook = (req, res, next) => {
  res.render("admin/addBook");
};

exports.postAddNewBook = async (req, res, next) => {
  try {
    const book_info = req.body.book;
    book_info.description = req.sanitize(book_info.description);

    const isDuplicate = await Book.find(book_info);

    if (isDuplicate.length > 0) {
      req.flash("error", "This book is already registered in inventory");
      return res.redirect("back");
    }

    const new_book = new Book(book_info);
    await new_book.save();
    req.flash(
      "success",
      `A new book named ${new_book.title} is added to the inventory`
    );
    res.redirect("/admin/bookInventory/all/all/1");
  } catch (err) {
    console.log(err);
    res.redirect("back");
  }
};

// admin -> issue book
exports.getIssueBook = (req, res, next) => {
  res.render("admin/issueBook");
};

exports.postIssueBook = async (req, res, next) => {
  const user = await User.findOne({ username: req.body.username });
  const book = await Book.findOne({ isbn: req.body.isbn });
  if (user.violationFlag) {
    req.flash(
      "error",
      "You are flagged for violating rules/delay on returning books/paying fines. Untill the flag is lifted, You can't issue any books"
    );
    return res.redirect("back");
  }

  if (req.user.bookIssueInfo.length >= 5) {
    req.flash("warning", "You can't issue more than 5 books at a time");
    return res.redirect("back");
  }

  try {
    // registering issue
    book.stock -= 1;
    const issue = new Issue({
      book_info: {
        id: book._id,
        title: book.title,
        author: book.author,
        ISBN: book.ISBN,
        category: book.category,
        stock: book.stock,
      },
      user_id: {
        id: user._id,
        username: user.username,
        userFullName: `${user.firstName} ${user.lastName}`,
      },
    });

    // putting issue record on individual user document
    user.bookIssueInfo.push(book._id);

    // logging the activity
    const activity = new Activity({
      info: {
        id: book._id,
        title: book.title,
      },
      category: "Issue",
      time: {
        id: issue._id,
        issueDate: issue.book_info.issueDate,
        returnDate: issue.book_info.returnDate,
      },
      user_id: {
        id: user._id,
        username: user.username,
        userFullName: `${user.firstName} ${user.lastName}`,
      },
    });

    // await ensure to synchronously save all database alteration
    await issue.save();
    await user.save();
    await book.save();
    await activity.save();

    req.flash("success", "Issue registered successfully");
    res.redirect("back");
  } catch (err) {
    console.log(err);
    return res.redirect("back");
  }
};

// admin -> show return/renew page
exports.getShowRenewReturn = async (req, res, next) => {
  try {
    const issue = await Issue.find();
    res.render("admin/return-renew", { user: issue });
  } catch (err) {
    console.log(err);
    return res.redirect("back");
  }
};

// admin -> show filtered return/renew page
exports.getFilterRenewReturn = async (req, res, next) => {
  try {
    const searchObj = {
      "user_id.username": req.body.username,
    };
    const issue = await Issue.find(searchObj);
    res.render("admin/return-renew", { user: issue });
  } catch (err) {
    console.log(err);
    return res.redirect("back");
  }
};

// admin -> renew book working procedure
/*
    1. construct the search object
    2. fetch issues based on search object
    3. increament return date by 7 days set isRenewed = true
    4. Log the activity
    5. save all db alteration
    6. redirect to /books/return-renew
*/
exports.postRenewBook = async (req, res, next) => {
  try {
    const searchObj = {
      "user_id.username": req.params.username,
      "book_info.id": req.params.book_id,
    };
    const issue = await Issue.findOne(searchObj);
    // adding extra 7 days to that issue
    let time = issue.book_info.returnDate.getTime();
    issue.book_info.returnDate = time + 7 * 24 * 60 * 60 * 1000;
    issue.book_info.isRenewed = true;

    // logging the activity
    const activity = new Activity({
      info: {
        id: issue._id,
        title: issue.book_info.title,
      },
      category: "Renew",
      time: {
        id: issue._id,
        issueDate: issue.book_info.issueDate,
        returnDate: issue.book_info.returnDate,
      },
      user_id: {
        id: issue.user_id._id,
        username: issue.user_id.username,
        userFullName: issue.user_id.userFullName,
      },
    });

    await activity.save();
    await issue.save();

    res.redirect("/admin/books/return-renew");
  } catch (err) {
    console.log(err);
    return res.redirect("back");
  }
};

// admin -> return book working procedure
/*
      1. Find the position of the book to be returned from user.bookIssueInfo
      2. Fetch the book from db and increament its stock by 1
      3. Remove issue record from db
      4. Pop bookIssueInfo from user by position
      5. Log the activity
      6. refirect to /books/return-renew
  */
exports.postReturnBook = async (req, res, next) => {
  try {
    // finding the position
    const book_id = req.params.book_id;
    const user = await User.findOne({ username: req.params.username });
    const pos = user.bookIssueInfo.indexOf(req.params.book_id);

    // fetching book from db and increament
    const book = await Book.findById(book_id);
    book.stock += 1;
    await book.save();

    // removing issue
    const issue = await Issue.findOne({ "user_id.id": user._id });
    await issue.remove();

    // popping book issue info from user
    user.bookIssueInfo.splice(pos, 1);
    await user.save();

    //   logging the activity
    const activity = new Activity({
      info: {
        id: issue.book_info.id,
        title: issue.book_info.title,
      },
      category: "Return",
      time: {
        id: issue._id,
        issueDate: issue.book_info.issueDate,
        returnDate: issue.book_info.returnDate,
      },
      user_id: {
        id: user._id,
        username: user.username,
        userFullName: `${user.firstName} ${user.lastName}`,
      },
    });
    await activity.save();

    // redirecting
    res.redirect("/admin/books/return-renew");
  } catch (err) {
    console.log(err);
    return res.redirect("back");
  }
};

// admin -> get profile
exports.getAdminProfile = (req, res, next) => {
  res.render("admin/profile");
};

// admin -> update profile
exports.postUpdateAdminProfile = async (req, res, next) => {
  try {
    const user_id = req.user._id;
    const update_info = req.body.admin;

    await User.findByIdAndUpdate(user_id, update_info);

    res.redirect("/admin/profile");
  } catch (err) {
    console.log(err);
    res.redirect("back");
  }
};

// admin -> update password
exports.putUpdateAdminPassword = async (req, res, next) => {
  try {
    const user_id = req.user._id;
    const old_password = req.body.oldPassword;
    const new_password = req.body.password;

    const admin = await User.findById(user_id);
    await admin.changePassword(old_password, new_password);
    await admin.save();

    req.flash(
      "success",
      "Your password is changed recently. Please login again to confirm"
    );
    res.redirect("/auth/admin-login");
  } catch (err) {
    console.log(err);
    res.redirect("back");
  }
};

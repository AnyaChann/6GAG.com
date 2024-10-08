const Category = require('./model');
const Post = require('../posts/model');

const getCategories = async (req, res, next) => {
  try {
    const data = await Category.find();
    res.status(200).json({
      message: 'Categories list',
      data: data,
    });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

const getCategory = (req, res, next) => {
  const catId = req.params.categoryId;
  return Category.findById(catId)
    .then((data) => {
      res.status(200).json({
        message: "Category's get successfully",
        data: data,
      });
      return data;
    })
    .catch((error) => {
      console.log(error);
      next(error);
    });
};

const getPostFromCategory = async (req, res, next) => {
  const catId = req.params.categoryId;
  try {
    const data = await Post.find({ categoryId: catId });
    res.status(200).json({
      message: "Category's get successfully",
      data: data,
    });
    return data;
  } catch (error) {
    console.log(error);
    next(error);
  }
};

module.exports = {
  getCategories,
  getCategory,
  getPostFromCategory,
};
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
JWT_SECRET = process.env.JWT_SECRET;
const pool = require("../Config/db");
const sendEmail = require("../Utils/Email");

//TODO: ======================================================== Register User ========================================================

// desc Register User
// @route post /api/user/register
// @access public
const registerAdmin = async (req, res) => {
  const {
    first_name,
    last_name,
    email,
    password,
    company_name,
    country,
    contact,
    business_category,
  } = req.body;

  try {
    // check if user already exists
    const user = await pool.query("SELECT * FROM admin WHERE email = $1", [
      email,
    ]);

    // if user exists, resend activation link
    if (user.rows.length > 0) {
      const activationLink = `http://localhost:5000/api/v1/activate_user?email=${user.rows[0].email}&token=${user.rows[0].token}`;

      const linkHtml = `
      <a href="${activationLink}" style="background-color: #4CAF50;
      border: none;
      color: white;
      padding: 15px 32px;
      margin: 15px 32px;
      text-align: center;
      text-decoration: none;">Activate Account</a>`;

      const html = `<p>Hi ${user.rows[0].last_name}, Click on the button below to activate your account. Link expires in 1hr.</p> <br>${linkHtml}</br>`;
      const tittle = "Welcome to Attendance App for Roscareer";
      const message =
        "Email already used, check your email for the activation link";

      await sendEmail(
        // to:
        user.rows[0].email,
        // subject:
        tittle,
        // text:
        message,
        // html:
        html
      );

      res.json({
        status: 201,
        message: `Email already used, check ${user.rows[0].email} for the activation link `,
      });
    } else {
      // if user does not exist, create user

      // encrypt password
      const salt = await bcrypt.genSalt(10);
      const encryptedPassword = await bcrypt.hash(password, salt);

      // insert user into database
      const newUser = await pool.query(
        "INSERT INTO admin (first_name, last_name, email, password,company_name,country,contact,business_category,token) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *",
        [
          first_name,
          last_name,
          email,
          encryptedPassword,
          company_name,
          country,
          contact,
          business_category,
          (token = generateToken(password)),
        ]
      );

      if (newUser.rows[0]) {
        const activationLink = `http://localhost:5000/api/v1/activate_user?email=${newUser.rows[0].email}&token=${newUser.rows[0].token}`;

        const linkHtml = `
        <a href="${activationLink}" style="background-color: #4CAF50;
        border: none;
        color: white;
        padding: 15px 32px;
        margin: 15px 32px;
        text-align: center;
        text-decoration: none;">Activate Account</a>`;

        const html = `<p>Hi ${newUser.rows[0].last_name}, Click on the button below to activate your account. Link expires in 1hr.</p> <br>${linkHtml}</br>`;
        const tittle = "Welcome to Attendance App for Roscareer";
        const message =
          "Thank you for registering with us. Please click on the button below to activate your account. Link expires in 1hr.";

        await sendEmail(
          // to:
          newUser.rows[0].email,
          // subject:
          tittle,
          // text:
          message,
          // html:
          html
        );

        res.json({
          status: 201,
          message: `activation link sent to ${newUser.rows[0].email}`,
        });
      }
    }
  } catch (error) {
    res.json({
      status: 400,
      message: `${error}`,
    });
  }
};

//TODO: =================================================================== ACTIVATE A NEW USER ===================================================================

//POST /activate/${email}&${token}
//@desc  Verify shopper email
//@ private
const activateUser = async (req, res) => {
  const { email, token } = req.body;
  // find user
  const user = await pool.query("SELECT * FROM admin WHERE email = $1", [
    email,
  ]);

  try {
    if (user.rows[0] && user.rows[0].token === token) {
      //  update current user activated column as true and token as null
      const updatedUser = await pool.query(
        "UPDATE admin SET activated = true WHERE email = $1 RETURNING *",
        [email]
      );

      res.json({
        status: 200,
        message: "Successfully verified user account",
      });
    } else {
      res.json({
        status: 400,
        message: "Invalid token or email",
      });
    }
  } catch (error) {
    res.json({
      status: 500,
      message: error.message,
    });
  }
};

// TODO: ======================================================== Login User ========================================================

// desc Login User
// @route post /api/v1/login
// @access public
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // check if user exists
    const user = await pool.query("SELECT * FROM admin WHERE email = $1", [
      email,
    ]);

    if (user.rows.length === 0) {
      return res.json({
        status: 400,
        message: "Invalid email address",
      });
    }

    // if user exists, compare password
    if (user && (await bcrypt.compare(password, user.rows[0].password))) {
      res.status(200).json({
        status: 200,
        message: "Successfully logged in",
        user: user.rows[0],
        token: generateToken(user.rows[0].id),
      });
    } else {
      res.json({
        status: 400,
        message: "Invalid password",
      });
      return;
    }
  } catch (error) {
    res.json({
      message: `${error}`,
    });
  }
};

// TODO: ======================================================== Update User ========================================================

// desc Update User
// @route post /api/v1/update
// @access public
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      first_name,
      last_name,
      email,
      company_name,
      country,
      contact,
      business_category,
    } = req.body;

    //  get the user from the database
    const user = await pool.query("SELECT * FROM admin WHERE id = $1", [id]);

    if (user.rows.length === 0) {
      return res.json({
        status: 400,
        message: "User not found",
      });
    }

    // update user
    const updatedUser = await pool.query(
      "UPDATE admin SET first_name = $1, last_name = $2, email = $3, company_name = $4, country = $5, contact = $6, business_category = $7  WHERE id = $8 RETURNING *",
      [
        first_name,
        last_name,
        email,
        company_name,
        country,
        contact,
        business_category,
        id,
      ]
    );

    res.json({
      status: 200,
      message: "User updated successfully",
      updatedUser: updatedUser.rows[0],
    });
  } catch (error) {
    res.json({
      message: `${error}`,
    });
  }
};

//TODO: ======================================================== Get All Sellers ========================================================

// desc Get All Users
// @route get /api/user/all
// @access private
const getAllSellers = async (req, res) => {
  try {
    const allSellers = await pool.query(
      "SELECT id,first_name,last_name, email, company_name,country,contact,business_category,created_at,activated FROM sellers"
    );

    res.json({
      status: 200,
      message: "Successfully fetched all users",
      allSellers: allSellers.rows,
    });
  } catch (error) {
    res.json({
      status: 400,
      message: `${error}`,
    });
  }
};

//TODO: ======================================================== Get All Shoppers ========================================================

// desc Get All Users
// @route get /api/user/all
// @access private
const getAllShoppers = async (req, res) => {
  try {
    const allShoppers = await pool.query(
      "SELECT id, email, created_at,activated FROM shoppers"
    );

    res.json({
      status: 200,
      message: "Successfully fetched all shoppers",
      allShoppers: allShoppers.rows,
    });
  } catch (error) {
    res.json({
      status: 400,
      message: `${error}`,
    });
  }
};

//TODO: ======================================================== Get All Products ========================================================

// desc Get All Users
// @route get /api/user/all
// @access private
const getAllProducts = async (req, res) => {
  try {
    const allProducts = await pool.query("SELECT * FROM products");

    res.json({
      status: 200,
      message: "Successfully fetched all products",
      allProducts: allProducts.rows,
    });
  } catch (error) {
    res.json({
      status: 400,
      message: `${error}`,
    });
  }
};

//TODO: ======================================================== Get  User ========================================================
// desc Get User
// @route get /api/user/:id
// @access private
const getUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await pool.query("SELECT * FROM admin WHERE id = $1", [id]);

    if (user.rows.length === 0) {
      return res.json({
        status: 400,
        message: "User not found",
      });
    } else {
      res.json({
        status: 200,
        message: "Successfully fetched user",
        user: user.rows[0],
      });
    }
  } catch (error) {
    res.json({
      status: 400,
      message: `${error}`,
    });
  }
};

// TODO: ========================================= Delete user =========================================
// desc Delete User
// @route delete /api/user/delete/:id
// @access private

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await pool.query("SELECT * FROM admin WHERE id = $1", [id]);

    if (user.rows.length === 0) {
      return res.json({
        status: 400,
        message: "User not found",
      });
    }

    const deletedUser = await pool.query("DELETE FROM admin WHERE id = $1", [
      id,
    ]);

    res.json({
      status: 200,
      message: "User deleted successfully",
      deletedUser: user.rows[0],
    });
  } catch (error) {
    res.json({
      status: 400,
      message: `${error}`,
    });
  }
};

// TODO: ========================================= Activate Product =========================================
// desc Activate Product
// @route post /api/admin/activate_product/:id
// @access private
const activateProduct = async (req, res) => {
  //  activate product
  try {
    const { id } = req.body;

    const product = await pool.query("SELECT * FROM products WHERE id = $1", [
      id,
    ]);

    if (product.rows.length === 0) {
      return res.json({
        status: 400,
        message: "Product not found",
      });
    }

    const activatedProduct = await pool.query(
      "UPDATE products SET product_activated = true WHERE id = $1 RETURNING *",
      [id]
    );

    res.json({
      status: 200,
      message: "Product activated successfully",
      activatedProduct: activatedProduct.rows[0],
    });
  } catch (error) {
    res.json({
      status: 400,
      message: `${error}`,
    });
  }
};

// TODO: ========================================= Deactivate Product =========================================
// desc Activate Product
// @route post /api/admin/activate_product/:id
// @access private
const deactivateProduct = async (req, res) => {
  //  deactivate product
  try {
    const { id } = req.body;

    const product = await pool.query("SELECT * FROM products WHERE id = $1", [
      id,
    ]);

    if (product.rows.length === 0) {
      return res.json({
        status: 400,
        message: "Product not found",
      });
    }

    const activatedProduct = await pool.query(
      "UPDATE products SET product_activated = false WHERE id = $1 RETURNING *",
      [id]
    );

    res.json({
      status: 200,
      message: "Product deactivated successfully",
      activatedProduct: activatedProduct.rows[0],
    });
  } catch (error) {
    res.json({
      status: 400,
      message: `${error}`,
    });
  }
};

// TODO: ========================================= Delete Product =========================================
// desc Activate Product
// @route post /api/admin/activate_product/:id
// @access private
const deleteProduct = async (req, res) => {
  //  delete product
  try {
    const { id } = req.body;

    const product = await pool.query("SELECT * FROM products WHERE id = $1", [
      id,
    ]);

    if (product.rows.length === 0) {
      return res.json({
        status: 400,
        message: "Product not found",
      });
    }

    const deletedProduct = await pool.query(
      "DELETE FROM products WHERE id = $1 RETURNING *",
      [id]
    );

    res.json({
      status: 200,
      message: "Product deleted successfully",
      deletedProduct: deletedProduct.rows[0],
    });
  } catch (error) {
    res.json({
      status: 400,
      message: `${error}`,
    });
  }
};

// TODO: =========================================  DashBoard Stats =========================================
// desc Dashboard stats
// @route post /api/admin/dashboard_info
// @access private
const dashBoardInfo = async (req, res) => {
  //  get dashboard stats
  try {
    // const totalAdmins = await pool.query("SELECT COUNT(*) FROM admin");
    const totalSellers = await pool.query("SELECT COUNT(*) FROM sellers");
    const totalShoppers = await pool.query("SELECT COUNT(*) FROM shoppers");
    const totalProducts = await pool.query("SELECT COUNT(*) FROM products");

    res.json({
      status: 200,
      message: "Dashboard stats",
      // totalAdmins: totalAdmins.rows[0].count,
      totalSellers: totalSellers.rows[0].count,
      totalShoppers: totalShoppers.rows[0].count,
      totalProducts: totalProducts.rows[0].count,
    });
  } catch (error) {
    res.json({
      status: 400,
      message: `${error}`,
    });
  }
};

// TODO: ========================================= Generate token =========================================

const generateToken = (id) => {
  return jwt.sign({ id }, JWT_SECRET, {
    expiresIn: "1h",
  });
};

module.exports = {
  registerAdmin,
  loginUser,
  getUser,
  updateUser,
  deleteUser,
  activateProduct,
  activateUser,
  getAllShoppers,
  getAllSellers,
  getAllProducts,
  deactivateProduct,
  deleteProduct,
  dashBoardInfo,
};

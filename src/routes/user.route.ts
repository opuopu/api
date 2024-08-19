import express from 'express';
import productController from '../controllers/product.controller';
import userController from '../controllers/user.controller';
import userAuth from '../middleware/user-auth.middleware';
import { changePasswordSchema } from './../middleware/validators/changePasswordValidator';
const router = express.Router();

router.get('/products', productController.getProducts);
router.post('/completeorder', userController.completeorder);
router.get('/products/:id', productController.getSingleProduct);
router.get('/banner', userController.getBanners);
router.get('/notice', userController.getNotices);
router.get('/notice-modal', userController.getNoticModal);
router.get('/topupproduct', userController.getTopupProducts);
router.get('/topuppackage/:id', userController.getTopupPackagesByProductId); // :id = product id
router.get('/payment-method', userController.getPaymentMethod);
router.post('/packageorder', userAuth, userController.topupPackageOrder);
router.get('/usertransaction', userAuth, userController.userTransaction);
router.get('/myorder', userAuth, userController.myOrder);
router.post('/addwallet', userAuth, userController.addWallet);
router.post('/reset-password', userController.resetPassword);
router.get('/reset-password-otp/:id', userController.resetPasswordOtp);
router.post('/reset-password-otp/:id', userController.resetPasswordVerify);
router.get('/user/profile', userAuth, userController.userProfile);
router.get('/my-stat', userAuth, userController.myStat);
router.get(
  '/topup-payment-method/active',
  userController.getActivePaymentMethods,
);
router.post('/change-phone', userAuth, userController.changePhone);
router.get('/verify-phone', userAuth, userController.verifyPhone);
router.post('/verify-otp', userAuth, userController.verifyOtp);
router.get('/inventories', userController.getInventories);
router.get('/inventories/:id', userController.getInventoriesById);
router.get('/inventories/cart-products', userController.cartProducts);
router.post('/product-order', userAuth, userController.productOrder);
router.get('/my-shop-lists', userAuth, userController.getMyShopList);
router.get(
  '/user-total-spent-and-order-count',
  userAuth,
  userController.getUserTotalSpentAndTotalOrderCount,
);
router.post(
  '/change-password',
  userAuth,
  changePasswordSchema,
  userController.changePassword,
);

router.get('/orders/:id', userController.orderDetailsById);

router.post('/reset-password-direct', userController.resetPasswordDirect);
// router.get('/pending-order/:id', userController.pendingOrder)

router.post('/auto-wallet-payment', userController.autoWalletPayment);
router.get('/auto-payment-success', userController.autoPaymentSuccess);
router.get('/auto-payment-cancel', userController.autoPaymentCancel);
router.get(
  '/auto-payment-repeat/:id',
  userAuth,
  userController.autoPaymentRepeatByUser,
);
router.get(
  '/auto-payment-cancel/:id',
  userAuth,
  userController.autoPaymentCancelByUser,
);

router.post('/u-order-webhook', userController.uOrderWebhook);
router.get('/u-order-success', userController.uOrderSuccess);
router.get('/u-order-cancel', userController.uOrderCancel);

export default router;

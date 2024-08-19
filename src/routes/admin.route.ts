import express from 'express';
import all_routes from 'express-list-endpoints';
import adminController from '../controllers/admin.controller';
import bannerController from '../controllers/banner.controller';
import noticeController from '../controllers/notice.controller';
import topupOrderMessage from '../controllers/topupOrderMessage.controller';
import paymentmethodController from '../controllers/paymentmethod.controller';
import physicalProductController from '../controllers/physicalProduct.controller';
import topuppackageController from '../controllers/topuppackage.controller';
import topupProductController from '../controllers/topupProduct.controller';
import userController from '../controllers/user.controller';
import auth from '../middleware/auth.middleware';
import { createAdminValidator } from '../middleware/validators/adminValidator';
import {
  addPermissionValidator,
  authModuleActiveValidator,
} from '../middleware/validators/authModuleValidator';
import { changePasswordSchema } from '../middleware/validators/changePasswordValidator';
import {
  bannerSchema,
  noticeSchema,
  paymentmethodSchema,
  sendSmsSchema,
} from '../middleware/validators/paymentMethodValidator';
import Schema from '../models';
import {
  updateAdminAuthValidator,
  updateTransactionRowValidator,
} from './../middleware/validators/authModuleValidator';
import {
  physicalProductSchema,
  topupPackageSchema,
  topupProductSchema,
  updateDollarSchema,
} from './../middleware/validators/paymentMethodValidator';
import { addTopupPackagePermissionSchema } from './../middleware/validators/topupPackagePermissionValidator.middleware';
const { AuthModule } = Schema;
const router = express();

router.get('/publish-permission', adminController.publishPermission);
router.get('/orders', auth, adminController.getOrders); // Get all orders
router.post(
  '/order/update-order-status/:id',
  auth,
  adminController.updateOrderStatus,
);
router.post(
  '/order/complete-selected-all',
  auth,
  adminController.completeSelectedOrders,
);
router.get('/admins', auth, adminController.getAdmins); // Get all admins
router.post('/admin/delete/:id', auth, adminController.deleteAdmin); // Get all admins
router.get('/admin/:id', auth, adminController.getAdminById); // Get admin by id
router.get('/admin-auth/:id', auth, adminController.getAdminAuthById); // Get admin auth by admin id
router.get('/auth-modules', auth, adminController.getAuthModules); // Get all auths

router.post(
  '/auth-modules/active/:id',
  auth,
  authModuleActiveValidator,
  adminController.activeAuthModules,
);
router.post(
  '/admin-auth/add-permission',
  auth,
  addPermissionValidator,
  adminController.addAdminPermission,
);
router.post(
  '/topup-package-permission/add-permission',
  auth,
  addTopupPackagePermissionSchema,
  topuppackageController.addPermission,
);
router.get(
  '/topup-package-permission/admin/:id',
  auth,
  topuppackageController.getTopupPackagePermissionByAdminId,
);
router.post(
  '/admin-auth/update',
  auth,
  updateAdminAuthValidator,
  adminController.updateAdminAuth,
); // Update admin auth by admin id
router.get('/orders/admin-order', auth, adminController.getAdminOrders); // Get orders those are under a sub admin
router.post(
  '/create-admin',
  auth,
  createAdminValidator,
  adminController.createNewAdmin,
); // Create new Admin

router.get('/transaction', auth, adminController.getAllTransaction);
router.get(
  '/automated-transaction',
  auth,
  adminController.getAllAutomatedTransaction,
);
router.get('/transaction/:id', auth, adminController.getTransactionById);
router.post('/transaction/update', auth, adminController.updateTransaction);
router.post(
  '/transaction/update-full-row/:id',
  auth,
  updateTransactionRowValidator,
  adminController.updateTransactionFullRow,
);
router.post(
  '/transaction/cancel-all',
  auth,
  adminController.cancelAllTransaction,
);
router.post(
  '/transaction/complete-selected-all',
  auth,
  adminController.completeSelectedlAllTransaction,
);

// Payment methos apis ----START----
router.get('/payment-methods', auth, paymentmethodController.getPaymentMethods);
router.get(
  '/payment-method/:id',
  auth,
  paymentmethodController.getPaymentMethodBYId,
);
router.post(
  '/payment-method/create',
  auth,
  paymentmethodSchema,
  paymentmethodController.createPaymentMethod,
);
router.post(
  '/payment-method/update/:id',
  auth,
  paymentmethodSchema,
  paymentmethodController.updatePaymentMethod,
);
router.post(
  '/payment-method/delete/:id',
  auth,
  paymentmethodController.deletePaymentMethod,
);
// Payment methos apis ----END----

// Notice apis ----START----
router.get('/notices', auth, noticeController.getNotices);
router.get('/notice/:id', auth, noticeController.getNoticeById);
router.post(
  '/notice/create',
  auth,
  noticeSchema,
  noticeController.createNotice,
);
router.post(
  '/notice/update/:id',
  auth,
  noticeSchema,
  noticeController.updateNotice,
);
router.post('/notice/delete/:id', auth, noticeController.deleteNotice);
// Notice apis ----END----

// Topup payment method

router.get(
  '/topup-pyament-methods',
  auth,
  paymentmethodController.topupPaymentMethods,
);
router.post(
  '/topup-payment-method/active/:id',
  auth,
  paymentmethodController.activateTopupPaymentMethod,
);
router.post(
  '/topup-payment-method/inactive/:id',
  auth,
  paymentmethodController.inActivateTopupPaymentMethod,
);

// Topup payment method end

// Notice apis ----START----
router.get('/banners', auth, bannerController.getBanners);
router.get('/banner/:id', auth, bannerController.getBannerById);
router.post(
  '/banner/create',
  auth,
  bannerSchema,
  bannerController.createBanner,
);
router.post(
  '/banner/update/:id',
  auth,
  bannerSchema,
  bannerController.updateBanner,
);
router.post('/banner/delete/:id', auth, bannerController.deleteBanner);
// Notice apis ----END----

// Topup Products apis ----START----
router.get('/topup-products', auth, topupProductController.getProducts);
router.get('/topup-product/:id', auth, topupProductController.getProductById);
router.post(
  '/topup-product/create',
  auth,
  topupProductSchema,
  topupProductController.createProduct,
);
router.post(
  '/topup-product/update/:id',
  auth,
  topupProductSchema,
  topupProductController.updateProduct,
);
router.post(
  '/topup-product/delete/:id',
  auth,
  topupProductController.deleteProduct,
);

router.post('/packages/add-voucher', auth, topupProductController.addVoucher);
router.get(
  '/packages/:package_id/voucher',
  auth,
  topupProductController.vouchersByPackage,
);

router.get(
  '/soft-delete-voucher',
  auth,
  topupProductController.softDeleteUsedVoucher,
);

router.get(
  '/packages/delete-voucher/:id',
  topupProductController.deleteVoucher,
);

router.get(
  '/voucher/available-voucher-by-package',
  auth,
  topupProductController.availableVoucherByPackage,
);
// Topup Products apis ----END----

// Physical Products apis ----START----
router.get('/physical-products', auth, physicalProductController.getProducts);
router.get(
  '/physical-product/:id',
  auth,
  physicalProductController.getProductById,
);
router.post(
  '/physical-product/create',
  auth,
  physicalProductSchema,
  physicalProductController.createProduct,
);
router.post(
  '/physical-product/update/:id',
  auth,
  physicalProductSchema,
  physicalProductController.updateProduct,
);
router.post(
  '/physical-product/delete/:id',
  auth,
  physicalProductController.deleteProduct,
);
// Physical Products apis ----END----

// Physical Product Orders apis ----START----
router.get(
  '/physical-products-order',
  auth,
  physicalProductController.getProductOrders,
);
router.post(
  '/update-physical-order-status/:id',
  auth,
  physicalProductController.updatePhysicalProductOrderStatus,
);
// Physical Product Orders apis ----END----

// User apis ----START----
router.get('/users', auth, userController.getUsers);
router.get('/user/:id', auth, userController.getUserById);
router.post('/user/update/:id', auth, userController.updateUser);
router.post('/user/delete/:id', auth, userController.deleteUser);
// User apis ----END----

// Topup Package apis ----START----
router.get('/topup-packages', auth, topuppackageController.getTopupPackages); // Get all topup packages
router.get(
  '/topup-packages/:id',
  auth,
  topuppackageController.getTopupPackagesByProductId,
); // Get topup packages by product id -> :id = product id
router.get(
  '/topup-package/:id',
  auth,
  topuppackageController.getTopupPackageById,
); // get topup package by id
router.post(
  '/topup-package/add',
  auth,
  topupPackageSchema,
  topuppackageController.createTopupPackage,
);
router.post(
  '/topup-package/update/:id',
  auth,
  topupPackageSchema,
  topuppackageController.updateTopupPackage,
);
router.post(
  '/topup-package/delete/:id',
  auth,
  topuppackageController.deleteTopupPackage,
);
router.post(
  '/topup-package/update-dollar',
  auth,
  updateDollarSchema,
  topuppackageController.updateDollarRate,
);
// Topup Package apis ----END----

// Dashboard stats apis ----START----
router.get('/dashboard-stats', auth, adminController.getDashboardStats);
// Dashboard stats apis ----END----

// Change password api ----START----
router.post(
  '/change-password',
  auth,
  changePasswordSchema,
  adminController.changePassword,
);
// Change password api ----END----

// Order completed by admin api -----START----
router.get(
  '/order-completed-by-admin',
  auth,
  adminController.orderCompletedByAdmin,
);
// Order completed by admin api -----END----

// Shell used by admin api -----START----
router.get('/shell-used-by-admin', auth, adminController.shellUsedByAdmin);
router.get('/com-by-admin/:date/:enddate', auth, adminController.comByAdmin);
// Shell used by admin api -----END----

// This month stats by admin api -----START----
router.get(
  '/this-month-completed-order',
  auth,
  adminController.thisMonthCompledOrder,
);
// This month stats by admin api -----END----

router.get('/orders-chart-data', auth, adminController.getOrderChartData);
router.get(
  '/this-month-sale-chart-data',
  auth,
  adminController.thisMonthSaleChartData,
);

// Get User for send sms
router.get('/users-for-send-sms', auth, adminController.getUsersForSendSms);
router.post('/send-sms', auth, sendSmsSchema, adminController.sendSmsToUser);

// topup order message
router.get(
  '/topup-order-message',
  auth,
  topupOrderMessage.getTopupOrderMessage,
);
router.post(
  '/topup-order-message/create',
  auth,
  topupOrderMessage.adminStoreTopupOrderMessage,
);
router.get(
  '/topup-order-message/delete/:id',
  auth,
  topupOrderMessage.adminDeleteTopupOrderMessage,
);

router.get(
  '/permission/sync',
  async (req: express.Request, res: express.Response) => {
    const routers = all_routes(router);
    for (const router of routers) {
      const path = router.path;
      for (const method of router.methods) {
        await AuthModule.findOrCreate({
          where: {
            auth_url: path,
            method,
          },
          defaults: {
            auth_url: path,
            method,
          },
        });
      }
    }
    res.send({ success: true });
  },
);

export default router;

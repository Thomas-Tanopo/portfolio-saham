import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { login, me } from '../controllers/authController';
import {
  getUsers, getUser, createUser, updateUser, deleteUser,
} from '../controllers/userController';
import {
  getSektors, createSektor, updateSektor, deleteSektor,
} from '../controllers/sektorController';
import {
  getSahams, getSaham, createSaham, updateSaham, patchDividend, deleteSaham,
} from '../controllers/sahamController';
import {
  getTransaksis, createTransaksi, updateTransaksi, deleteTransaksi, resubmitTransaksi, getActivityLog,
} from '../controllers/transaksiController';
import {
  getRoles, getRole, createRole, updateRole, deleteRole,
} from '../controllers/roleController';
import { getHarga, getHargaBatch } from '../controllers/hargaController';
import { uploadFile } from '../controllers/uploadController';
import upload from '../lib/upload';
import {
  getApprovalMatrix, createApprovalMatrix, updateApprovalMatrix, deleteApprovalMatrix,
} from '../controllers/approvalMatrixController';
import {
  getApprovalMatrixGroups, createApprovalMatrixGroup, updateApprovalMatrixGroup, deleteApprovalMatrixGroup,
} from '../controllers/approvalMatrixGroupController';
import { getPendingApprovals, processApproval } from '../controllers/approvalController';

const router = Router();

// Auth (no middleware)
router.post('/auth/login', login);
router.get('/auth/me', authenticate, me);

// Protected routes
router.use(authenticate);

// Users
router.get('/users', getUsers);
router.get('/users/:id', getUser);
router.post('/users', createUser);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

// Sektors
router.get('/sektor', getSektors);
router.post('/sektor', createSektor);
router.put('/sektor/:id', updateSektor);
router.delete('/sektor/:id', deleteSektor);

// Sahams
router.get('/saham', getSahams);
router.get('/saham/:id', getSaham);
router.post('/saham', createSaham);
router.put('/saham/:id', updateSaham);
router.patch('/saham/:id/dividend', patchDividend);
router.delete('/saham/:id', deleteSaham);

// Transaksis
router.get('/transaksi', getTransaksis);
router.post('/transaksi', createTransaksi);
router.put('/transaksi/:id', updateTransaksi);
router.get('/transaksi/:id/activity', getActivityLog);
router.post('/transaksi/:id/resubmit', resubmitTransaksi);
router.delete('/transaksi/:id', deleteTransaksi);

// Roles
router.get('/role', getRoles);
router.get('/role/:id', getRole);
router.post('/role', createRole);
router.put('/role/:id', updateRole);
router.delete('/role/:id', deleteRole);

// Harga Pasar
router.get('/harga/:kode', getHarga);
router.post('/harga/batch', getHargaBatch);

// Upload
router.post('/upload', upload.single('file'), uploadFile);

// Approval Matrix Group
router.get('/approval-matrix-group', getApprovalMatrixGroups);
router.post('/approval-matrix-group', createApprovalMatrixGroup);
router.put('/approval-matrix-group/:id', updateApprovalMatrixGroup);
router.delete('/approval-matrix-group/:id', deleteApprovalMatrixGroup);

// Approval Matrix
router.get('/approval-matrix', getApprovalMatrix);
router.post('/approval-matrix', createApprovalMatrix);
router.put('/approval-matrix/:id', updateApprovalMatrix);
router.delete('/approval-matrix/:id', deleteApprovalMatrix);

// Approval
router.get('/approval/pending', getPendingApprovals);
router.post('/approval/:transaksiId/process', processApproval);

export default router;

// package com.hotelmanagement.service;

// import com.hotelmanagement.dto.AuthDtos.LoginRequest;
// import com.hotelmanagement.dto.OwnerDtos.CreateBranchRequest;
// import com.hotelmanagement.entity.*;
// import com.hotelmanagement.enums.*;
// import com.hotelmanagement.repository.*;
// import com.hotelmanagement.security.CurrentUser;
// import com.hotelmanagement.security.JwtService;
// import org.junit.jupiter.api.BeforeEach;
// import org.junit.jupiter.api.Test;
// import org.junit.jupiter.api.extension.ExtendWith;
// import org.mockito.Mock;
// import org.mockito.junit.jupiter.MockitoExtension;
// import org.springframework.security.access.AccessDeniedException;
// import org.springframework.security.authentication.BadCredentialsException;
// import org.springframework.security.crypto.password.PasswordEncoder;

// import java.math.BigDecimal;
// import java.time.LocalDate;
// import java.util.*;

// import static org.junit.jupiter.api.Assertions.*;
// import static org.mockito.ArgumentMatchers.*;
// import static org.mockito.Mockito.*;

// @ExtendWith(MockitoExtension.class)
// class MultiBranchSecurityTest {

// @Mock private CurrentUser cu;
// @Mock private BranchRepository branchRepo;
// @Mock private UserRepository userRepo;
// @Mock private InvoiceRepository invoiceRepo;
// @Mock private PaymentRepository paymentRepo;
// @Mock private PurchaseInvoiceRepository purchaseRepo;
// @Mock private StaffRepository staffRepo;
// @Mock private HotelOrderRepository orderRepo;
// @Mock private KotRepository kotRepo;
// @Mock private BusinessRepository businessRepo;
// @Mock private PasswordEncoder passwordEncoder;
// @Mock private ReportService reportService;
// @Mock private RefreshTokenRepository refreshRepo;
// @Mock private JwtService jwtService;
// @Mock private InvoiceItemRepository itemRepo;
// @Mock private HotelTableRepository tableRepo;
// @Mock private SupplierRepository supplierRepo;
// @Mock private PurchaseOrderRepository poRepo;
// @Mock private SupplierPaymentRepository spRepo;
// @Mock private GoodsReceiptRepository grRepo;
// @Mock private PurchaseReturnRepository prRepo;
// @Mock private NotificationRepository notifRepo;
// @Mock private InventoryService invService;
// @Mock private HotelSettingRepository settingRepo;

// private OwnerService ownerService;
// private AuthService authService;
// private FinancialService financialService;

// private Business testBusiness;
// private Branch puneBranch;
// private Branch dhuleBranch;
// private User ownerUser;
// private User puneUser;
// private User dhuleUser;

// @BeforeEach
// void setup() {
// testBusiness = new Business();
// testBusiness.setId(1L);
// testBusiness.setName("Hotel Grand");
// testBusiness.setCode("HOTEL_GRAND");

// puneBranch = new Branch();
// puneBranch.setId(101L);
// puneBranch.setName("Pune Branch");
// puneBranch.setCode("BR-PUNE-1");
// puneBranch.setBusiness(testBusiness);
// puneBranch.setStatus("ACTIVE");

// dhuleBranch = new Branch();
// dhuleBranch.setId(102L);
// dhuleBranch.setName("Dhule Branch");
// dhuleBranch.setCode("BR-DHULE-2");
// dhuleBranch.setBusiness(testBusiness);
// dhuleBranch.setStatus("ACTIVE");

// ownerUser = new User();
// ownerUser.setId(1L);
// ownerUser.setUsername("hotel_owner");
// ownerUser.setRole(UserRole.OWNER);
// ownerUser.setBusiness(testBusiness);
// ownerUser.setBranch(null); // Owner has null branch
// ownerUser.setActive(true);

// puneUser = new User();
// puneUser.setId(2L);
// puneUser.setUsername("pune_admin");
// puneUser.setRole(UserRole.BRANCH_ADMIN);
// puneUser.setBusiness(testBusiness);
// puneUser.setBranch(puneBranch);
// puneUser.setActive(true);

// dhuleUser = new User();
// dhuleUser.setId(3L);
// dhuleUser.setUsername("dhule_admin");
// dhuleUser.setRole(UserRole.BRANCH_ADMIN);
// dhuleUser.setBusiness(testBusiness);
// dhuleUser.setBranch(dhuleBranch);
// dhuleUser.setActive(true);

// ownerService = new OwnerService(
// cu, branchRepo, userRepo, invoiceRepo, paymentRepo,
// purchaseRepo, staffRepo, orderRepo, kotRepo, businessRepo,
// passwordEncoder, reportService
// );

// authService = new AuthService(
// userRepo, businessRepo, branchRepo, refreshRepo, passwordEncoder, jwtService
// );

// financialService = new FinancialService(
// cu, invoiceRepo, itemRepo, paymentRepo, orderRepo, tableRepo,
// branchRepo, supplierRepo, poRepo, purchaseRepo, spRepo,
// grRepo, prRepo, kotRepo, notifRepo, invService, settingRepo
// );
// }

// // =========================================================================
// // TEST: OWNER PRIVILEGE ENFORCEMENT
// // =========================================================================
// @Test
// void testBranchUserCannotAccessOwnerApis() {
// // When caller is branch user, cu.requireOwner() throws AccessDeniedException
// doThrow(new AccessDeniedException("Access denied: Branch users cannot access
// Owner Admin APIs."))
// .when(cu).requireOwner();

// assertThrows(AccessDeniedException.class, () -> ownerService.getDashboard());
// assertThrows(AccessDeniedException.class, () ->
// ownerService.getAllBranches());
// }

// // =========================================================================
// // TEST 7: PUNE USER ATTEMPTS TO ACCESS DHULE INVOICE (MUST BE DENIED)
// // =========================================================================
// @Test
// void testPuneUserCannotAccessDhuleInvoice() {
// Invoice dhuleInvoice = new Invoice();
// dhuleInvoice.setId(999L);
// dhuleInvoice.setBusiness(testBusiness);
// dhuleInvoice.setBranch(dhuleBranch);
// dhuleInvoice.setInvoiceNumber("INV-DHULE-001");
// dhuleInvoice.setGrandTotal(new BigDecimal("1500.00"));

// when(cu.businessId()).thenReturn(1L);
// when(cu.isBranchUser()).thenReturn(true);
// when(cu.branchId()).thenReturn(101L); // Pune Branch ID
// when(invoiceRepo.findByIdAndBusinessId(999L,
// 1L)).thenReturn(Optional.of(dhuleInvoice));

// // Pune user attempting to access Dhule invoice MUST throw
// AccessDeniedException
// AccessDeniedException ex = assertThrows(AccessDeniedException.class, () ->
// financialService.invoice(999L));
// assertTrue(ex.getMessage().contains("You are not authorized to access
// invoices of another branch"));
// }

// // =========================================================================
// // TEST: PUNE USER CAN ACCESS PUNE INVOICE
// // =========================================================================
// @Test
// void testPuneUserCanAccessPuneInvoice() {
// Invoice puneInvoice = new Invoice();
// puneInvoice.setId(888L);
// puneInvoice.setBusiness(testBusiness);
// puneInvoice.setBranch(puneBranch);
// puneInvoice.setInvoiceNumber("INV-PUNE-001");
// puneInvoice.setGrandTotal(new BigDecimal("750.00"));
// puneInvoice.setStatus(InvoiceStatus.PAID);
// puneInvoice.setSubtotal(new BigDecimal("750.00"));
// puneInvoice.setTaxableAmount(new BigDecimal("750.00"));
// puneInvoice.setItems(new ArrayList<>());

// when(cu.businessId()).thenReturn(1L);
// when(cu.isBranchUser()).thenReturn(true);
// when(cu.branchId()).thenReturn(101L); // Pune Branch ID
// when(invoiceRepo.findByIdAndBusinessId(888L,
// 1L)).thenReturn(Optional.of(puneInvoice));

// Map<String, Object> result = financialService.invoice(888L);
// assertNotNull(result);
// assertEquals("INV-PUNE-001", result.get("invoiceNumber"));
// assertEquals(101L, result.get("branchId"));
// }

// // =========================================================================
// // TEST 10: DEACTIVATED BRANCH USER CANNOT LOGIN
// // =========================================================================
// @Test
// void testDeactivatedBranchUserCannotLogin() {
// Branch inactiveBranch = new Branch();
// inactiveBranch.setId(103L);
// inactiveBranch.setName("Beed Branch");
// inactiveBranch.setStatus("INACTIVE"); // Deactivated

// User beedUser = new User();
// beedUser.setId(4L);
// beedUser.setUsername("beed_admin");
// beedUser.setPasswordHash("hashed_pwd");
// beedUser.setActive(true);
// beedUser.setBranch(inactiveBranch);

// when(userRepo.findWithBusinessByUsernameIgnoreCase("beed_admin")).thenReturn(Optional.of(beedUser));

// LoginRequest req = new LoginRequest("beed_admin", "password123", false);

// BadCredentialsException ex = assertThrows(BadCredentialsException.class, ()
// -> authService.login(req));
// assertTrue(ex.getMessage().contains("deactivated"));
// }

// // =========================================================================
// // TEST: OWNER PROFIT ANALYSIS CALCULATION FROM DATABASE RECORDS
// // =========================================================================
// @Test
// void testOwnerProfitAnalysisCalculation() {
// when(cu.businessId()).thenReturn(1L);
// when(branchRepo.findAllByBusinessId(1L)).thenReturn(List.of(puneBranch,
// dhuleBranch));

// Invoice inv1 = new Invoice();
// inv1.setId(1L);
// inv1.setBranch(puneBranch);
// inv1.setGrandTotal(new BigDecimal("5000.00"));
// inv1.setStatus(InvoiceStatus.PAID);
// inv1.setInvoiceDate(LocalDate.now());

// Payment pay1 = new Payment();
// pay1.setId(1L);
// pay1.setBranch(puneBranch);
// pay1.setAmount(new BigDecimal("5000.00"));
// pay1.setStatus(PaymentStatus.SUCCESS);
// pay1.setPaymentDate(LocalDate.now());

// PurchaseInvoice pi1 = new PurchaseInvoice();
// pi1.setId(1L);
// pi1.setBranch(puneBranch);
// pi1.setTotal(new BigDecimal("2000.00"));
// pi1.setInvoiceDate(LocalDate.now());

// when(invoiceRepo.findAllByBusinessId(1L)).thenReturn(List.of(inv1));
// when(paymentRepo.findAllByBusinessId(1L)).thenReturn(List.of(pay1));
// when(purchaseRepo.findAllByBusinessId(1L)).thenReturn(List.of(pi1));

// var profit = ownerService.getProfitAnalysis(null, null, null);
// assertNotNull(profit);
// assertEquals(new BigDecimal("5000.00"), profit.totalBillingAmount());
// assertEquals(new BigDecimal("5000.00"), profit.totalPaymentsReceived());
// assertEquals(new BigDecimal("2000.00"), profit.totalPurchaseAmount());
// // Estimated profit = Payments (5000) - Purchases (2000) = 3000
// assertEquals(new BigDecimal("3000.00"), profit.estimatedBusinessProfit());
// }
// }

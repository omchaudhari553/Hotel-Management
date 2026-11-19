package com.hotelmanagement.config;

import com.hotelmanagement.entity.*;
import com.hotelmanagement.enums.*;
import com.hotelmanagement.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.math.BigDecimal;
import java.time.LocalDate;

@Configuration
public class DevDataSeeder {

    private static final Logger log = LoggerFactory.getLogger(DevDataSeeder.class);

    @Bean
    CommandLineRunner seed(BusinessRepository bs, BranchRepository br, UserRepository us, 
                           HotelTableRepository ts, StaffRepository ss, InvoiceRepository invs, 
                           PaymentRepository ps, PasswordEncoder enc) {
        return args -> {
            try {
                seedMultiBranchData(bs, br, us, ts, ss, invs, ps, enc);
            } catch (Exception e) {
                log.warn("Seeding multi-branch data skipped or failed: {}", e.getMessage(), e);
            }
        };
    }

    @org.springframework.transaction.annotation.Transactional
    public void seedMultiBranchData(BusinessRepository bs, BranchRepository br, UserRepository us,
                                     HotelTableRepository ts, StaffRepository ss, InvoiceRepository invs,
                                     PaymentRepository ps, PasswordEncoder enc) {
        String ownerUsername = "hoteladmin";
        String ownerEmail = "admin@royalpalace.com";

        // Never overwrite existing data on restarts
        if (us.findByUsernameIgnoreCase(ownerUsername).isPresent() && br.count() >= 4) {
            log.info("Multi-branch system already initialized. Preserving all existing database records.");
            return;
        }

        Business b = bs.findAll().stream().findFirst().orElse(null);
        if (b == null) {
            b = new Business();
            b.setName("Royal Palace Hotel");
            b.setCode("HOTEL_HOTELADMIN");
            b.setIndustryType(IndustryType.HOTEL);
            b.setOwnerName("Rahul Patil");
            b.setContactEmail(ownerEmail);
            b.setPhone("9876543210");
            b.setCurrency("INR");
            b.setActive(true);
            b = bs.save(b);
        }

        final Business business = b;

        // 1. Ensure Owner User (Role: OWNER, branch: null)
        us.findByUsernameIgnoreCase(ownerUsername).ifPresentOrElse(u -> {
            u.setPasswordHash(enc.encode("Admin@123"));
            u.setFullName("Rahul Patil (Owner)");
            if (u.getEmail() == null || u.getEmail().isBlank()) {
                u.setEmail(ownerEmail);
            }
            u.setActive(true);
            u.setRole(UserRole.OWNER);
            u.setBranch(null);
            us.save(u);
        }, () -> {
            User u = new User();
            u.setBusiness(business);
            u.setUsername(ownerUsername);
            u.setEmail(ownerEmail);
            u.setFullName("Rahul Patil (Owner)");
            u.setPasswordHash(enc.encode("Admin@123"));
            u.setRole(UserRole.OWNER);
            u.setBranch(null);
            u.setActive(true);
            us.save(u);
        });

        // Ensure admin user (username: admin, email: admin@royalpalace.com, password: Admin@123)
        us.findByUsernameIgnoreCase("admin").ifPresentOrElse(u -> {
            u.setEmail("admin@royalpalace.com");
            u.setPasswordHash(enc.encode("Admin@123"));
            u.setActive(true);
            u.setRole(UserRole.OWNER);
            u.setBranch(null);
            us.save(u);
        }, () -> {
            User u = new User();
            u.setBusiness(business);
            u.setUsername("admin");
            u.setEmail("admin@royalpalace.com");
            u.setFullName("Administrator");
            u.setPasswordHash(enc.encode("Admin@123"));
            u.setRole(UserRole.OWNER);
            u.setBranch(null);
            u.setActive(true);
            us.save(u);
        });

        // 2. Ensure Main Branch
        Branch mainBranch = br.findAllByBusinessId(business.getId()).stream()
                .filter(brItem -> "Main Branch".equalsIgnoreCase(brItem.getName()))
                .findFirst()
                .orElseGet(() -> {
                    Branch mb = new Branch();
                    mb.setBusiness(business);
                    mb.setName("Main Branch");
                    mb.setCode("MB-" + business.getId());
                    mb.setManagerName("Rahul Patil");
                    mb.setEmail(ownerEmail);
                    mb.setContactPhone("9876543210");
                    mb.setOperatingHours("24x7");
                    mb.setAddress("Hotel Premises");
                    mb.setCity("Mumbai");
                    mb.setState("Maharashtra");
                    mb.setStatus("ACTIVE");
                    mb.setEstablishedOn(LocalDate.now());
                    return br.save(mb);
                });

        log.info("Multi-branch system initialization complete. Demo branches disabled.");
    }

    private Branch seedBranch(BranchRepository br, Business b, String name, String code, String manager,
                              String phone, String email, String address, String city, String state) {
        return br.findAllByBusinessId(b.getId()).stream()
                .filter(brItem -> name.equalsIgnoreCase(brItem.getName()) || code.equalsIgnoreCase(brItem.getCode()))
                .findFirst()
                .orElseGet(() -> {
                    Branch brNew = new Branch();
                    brNew.setBusiness(b);
                    brNew.setName(name);
                    brNew.setCode(code);
                    brNew.setManagerName(manager);
                    brNew.setContactPhone(phone);
                    brNew.setEmail(email);
                    brNew.setOperatingHours("10:00 AM - 11:00 PM");
                    brNew.setAddress(address);
                    brNew.setCity(city);
                    brNew.setState(state);
                    brNew.setStatus("ACTIVE");
                    brNew.setEstablishedOn(LocalDate.now());
                    return br.save(brNew);
                });
    }

    private void seedBranchUser(UserRepository us, Business b, Branch branch, String username, String email,
                                String fullName, PasswordEncoder enc, String rawPassword) {
        us.findByUsernameIgnoreCase(username).ifPresentOrElse(u -> {
            u.setPasswordHash(enc.encode(rawPassword));
            u.setFullName(fullName);
            u.setEmail(email);
            u.setActive(true);
            u.setRole(UserRole.BRANCH_ADMIN);
            u.setBranch(branch);
            us.save(u);
        }, () -> {
            User u = new User();
            u.setBusiness(b);
            u.setBranch(branch);
            u.setUsername(username);
            u.setEmail(email);
            u.setFullName(fullName);
            u.setPasswordHash(enc.encode(rawPassword));
            u.setRole(UserRole.BRANCH_ADMIN);
            u.setActive(true);
            us.save(u);
        });
    }

    private void seedTablesForBranch(HotelTableRepository ts, Business b, Branch branch, String prefix) {
        if (ts.findAllByBusinessIdAndBranchId(b.getId(), branch.getId()).isEmpty()) {
            HotelTable t1 = new HotelTable();
            t1.setBusiness(b);
            t1.setBranch(branch);
            t1.setName("Table " + prefix + "-1");
            t1.setArea("Ground Floor");
            t1.setCapacity(4);
            t1.setStatus(TableStatus.AVAILABLE);
            ts.save(t1);

            HotelTable t2 = new HotelTable();
            t2.setBusiness(b);
            t2.setBranch(branch);
            t2.setName("Table " + prefix + "-2");
            t2.setArea("Ground Floor");
            t2.setCapacity(6);
            t2.setStatus(TableStatus.AVAILABLE);
            ts.save(t2);
        }
    }

    private void seedStaffForBranch(StaffRepository ss, Business b, Branch branch, String name, String code,
                                    String designation, String phone, BigDecimal salary) {
        if (ss.findFirstByBusinessIdAndStaffCode(b.getId(), code).isEmpty()) {
            Staff s = new Staff();
            s.setBusiness(b);
            s.setBranch(branch);
            s.setName(name);
            s.setStaffCode(code);
            s.setDesignation(designation);
            s.setPhone(phone);
            s.setAddress("Staff Quarters, " + branch.getCity());
            s.setBasicSalary(salary);
            s.setSalaryFrequency("MONTHLY");
            s.setJoiningDate(LocalDate.now());
            s.setActive(true);
            ss.save(s);
        }
    }

    private void seedSampleSale(InvoiceRepository invs, PaymentRepository ps, UserRepository us,
                                Business b, Branch branch, String invNum, BigDecimal amount, String creatorUsername) {
        if (invs.findFirstByBusinessIdAndInvoiceNumber(b.getId(), invNum).isEmpty()) {
            Invoice inv = new Invoice();
            inv.setBusiness(b);
            inv.setBranch(branch);
            inv.setInvoiceNumber(invNum);
            inv.setInvoiceDate(LocalDate.now());
            inv.setGrandTotal(amount);
            inv.setSubtotal(amount);
            inv.setPaidAmount(amount);
            inv.setDueAmount(BigDecimal.ZERO);
            inv.setStatus(InvoiceStatus.PAID);
            inv.setPaymentMethod("UPI");
            Invoice savedInv = invs.save(inv);

            Payment p = new Payment();
            p.setBusiness(b);
            p.setBranch(branch);
            p.setInvoice(savedInv);
            p.setAmount(amount);
            p.setPaymentMethod(PaymentMethod.UPI);
            p.setPaymentDate(LocalDate.now());
            p.setStatus(PaymentStatus.SUCCESS);
            p.setTransactionRef("TXN-" + invNum);
            us.findByUsernameIgnoreCase(creatorUsername).ifPresent(p::setCreatedBy);
            ps.save(p);
        }
    }
}

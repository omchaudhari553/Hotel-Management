package com.hotelmanagement.config;

import com.hotelmanagement.entity.*;
import com.hotelmanagement.enums.*;
import com.hotelmanagement.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
@Profile("dev")
public class DevDataSeeder {

    private static final Logger log = LoggerFactory.getLogger(DevDataSeeder.class);

    @Bean
    CommandLineRunner seed(BusinessRepository bs, BranchRepository br, UserRepository us, PasswordEncoder enc) {
        return args -> {
            try {
                seedHotelAdminUser(bs, br, us, enc);
            } catch (Exception e) {
                log.warn("Seeding hoteladmin user skipped or failed: {}", e.getMessage());
            }
        };
    }

    private void seedHotelAdminUser(BusinessRepository bs, BranchRepository br, UserRepository us, PasswordEncoder enc) {
        String username = "hoteladmin";
        String email = "admin@royalpalace.com";
        String businessName = "Royal Palace Hotel";
        String businessCode = "HOTEL_HOTELADMIN";

        Business b = bs.findByCode(businessCode);
        if (b == null) {
            b = new Business();
            b.setName(businessName);
            b.setCode(businessCode);
            b.setIndustryType(IndustryType.HOTEL);
            b.setOwnerName("Rahul Patil");
            b.setContactEmail(email);
            b.setCurrency("INR");
            b.setActive(true);
            b = bs.save(b);

            Branch branch = new Branch();
            branch.setBusiness(b);
            branch.setName("Main Branch");
            branch.setCode("MB-" + b.getId());
            branch.setManagerName("Rahul Patil");
            branch.setEmail(email);
            branch.setOperatingHours("24x7");
            branch.setAddress("Hotel Premises");
            branch.setStatus("ACTIVE");
            br.save(branch);
        }

        final Business business = b;
        us.findByUsernameIgnoreCase(username).ifPresentOrElse(u -> {
            u.setPasswordHash(enc.encode("Admin@12345"));
            u.setFullName("Rahul Patil");
            u.setEmail(email);
            u.setActive(true);
            u.setRole(UserRole.ADMIN);
            us.save(u);
        }, () -> {
            User u = new User();
            u.setBusiness(business);
            u.setUsername(username);
            u.setEmail(email);
            u.setFullName("Rahul Patil");
            u.setPasswordHash(enc.encode("Admin@12345"));
            u.setRole(UserRole.ADMIN);
            u.setActive(true);
            us.save(u);
        });
        log.info("Hotel admin user [{}] verified/seeded successfully.", username);
    }
}

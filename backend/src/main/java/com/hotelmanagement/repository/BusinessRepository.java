package com.hotelmanagement.repository;
import com.hotelmanagement.entity.Business;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
import java.time.*;


public interface BusinessRepository extends JpaRepository<Business,Long> {
    Business findByCode(String code);
}

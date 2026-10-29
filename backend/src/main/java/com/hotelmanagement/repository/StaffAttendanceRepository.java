package com.hotelmanagement.repository;
import com.hotelmanagement.entity.StaffAttendance;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
import java.time.*;


public interface StaffAttendanceRepository extends JpaRepository<StaffAttendance,Long> {
    Optional<StaffAttendance> findByStaffIdAndAttendanceDate(Long staffId,LocalDate date);
    List<StaffAttendance> findAllByStaffBusinessId(Long businessId);
}

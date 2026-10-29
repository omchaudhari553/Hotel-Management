package com.hotelmanagement.repository;
import com.hotelmanagement.entity.Expense;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
import java.time.*;


public interface ExpenseRepository extends JpaRepository<Expense,Long> {
    List<Expense> findAllByBusinessId(Long businessId);
    long countByBusinessId(Long businessId);
    Optional<Expense> findByIdAndBusinessId(Long id,Long businessId);
}

package com.hotelmanagement.repository;

import com.hotelmanagement.entity.PrinterConfiguration;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PrinterConfigurationRepository extends JpaRepository<PrinterConfiguration, Long> {

    @Query("SELECT p FROM PrinterConfiguration p LEFT JOIN FETCH p.business LEFT JOIN FETCH p.branch WHERE p.business.id = :businessId ORDER BY p.id ASC")
    List<PrinterConfiguration> findAllByBusinessId(@Param("businessId") Long businessId);

    @Query("SELECT p FROM PrinterConfiguration p LEFT JOIN FETCH p.business LEFT JOIN FETCH p.branch WHERE p.business.id = :businessId AND (:branchId IS NULL OR p.branch.id = :branchId OR p.branch IS NULL) ORDER BY p.id ASC")
    List<PrinterConfiguration> findAllByBusinessIdAndBranchId(@Param("businessId") Long businessId, @Param("branchId") Long branchId);

    @Query("SELECT p FROM PrinterConfiguration p LEFT JOIN FETCH p.business LEFT JOIN FETCH p.branch WHERE p.id = :id AND p.business.id = :businessId")
    Optional<PrinterConfiguration> findByIdAndBusinessId(@Param("id") Long id, @Param("businessId") Long businessId);

    @Query("SELECT p FROM PrinterConfiguration p LEFT JOIN FETCH p.business LEFT JOIN FETCH p.branch WHERE p.business.id = :businessId AND p.isDefault = true")
    Optional<PrinterConfiguration> findDefaultByBusinessId(@Param("businessId") Long businessId);

    @Query("SELECT p FROM PrinterConfiguration p LEFT JOIN FETCH p.business LEFT JOIN FETCH p.branch WHERE p.business.id = :businessId AND p.isReceiptDefault = true")
    Optional<PrinterConfiguration> findReceiptDefaultByBusinessId(@Param("businessId") Long businessId);

    @Query("SELECT p FROM PrinterConfiguration p LEFT JOIN FETCH p.business LEFT JOIN FETCH p.branch WHERE p.business.id = :businessId AND p.isKotDefault = true")
    Optional<PrinterConfiguration> findKotDefaultByBusinessId(@Param("businessId") Long businessId);

    @Query("SELECT p FROM PrinterConfiguration p LEFT JOIN FETCH p.business LEFT JOIN FETCH p.branch WHERE p.business.id = :businessId AND p.isPurchaseDefault = true")
    Optional<PrinterConfiguration> findPurchaseDefaultByBusinessId(@Param("businessId") Long businessId);

    @Modifying
    @Query("UPDATE PrinterConfiguration p SET p.isDefault = false WHERE p.business.id = :businessId")
    void resetDefaultByBusinessId(@Param("businessId") Long businessId);

    @Modifying
    @Query("UPDATE PrinterConfiguration p SET p.isReceiptDefault = false WHERE p.business.id = :businessId")
    void resetReceiptDefaultByBusinessId(@Param("businessId") Long businessId);

    @Modifying
    @Query("UPDATE PrinterConfiguration p SET p.isKotDefault = false WHERE p.business.id = :businessId")
    void resetKotDefaultByBusinessId(@Param("businessId") Long businessId);

    @Modifying
    @Query("UPDATE PrinterConfiguration p SET p.isPurchaseDefault = false WHERE p.business.id = :businessId")
    void resetPurchaseDefaultByBusinessId(@Param("businessId") Long businessId);
}


package com.hotelmanagement.repository.saas;

import com.hotelmanagement.entity.saas.SaasAuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SaasAuditLogRepository extends JpaRepository<SaasAuditLog, Long> {
    Page<SaasAuditLog> findAllByOrderByCreatedAtDesc(Pageable pageable);
    List<SaasAuditLog> findTop50ByOrderByCreatedAtDesc();
}

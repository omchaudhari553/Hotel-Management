package com.hotelmanagement.repository.saas;

import com.hotelmanagement.entity.saas.SaasSupportTicket;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SaasSupportTicketRepository extends JpaRepository<SaasSupportTicket, Long> {
    Optional<SaasSupportTicket> findByTicketNumber(String ticketNumber);
    List<SaasSupportTicket> findAllByBusinessId(Long businessId);
    List<SaasSupportTicket> findAllByStatusIgnoreCase(String status);
    List<SaasSupportTicket> findAllByPriorityIgnoreCase(String priority);
    long countByStatusIgnoreCase(String status);
}

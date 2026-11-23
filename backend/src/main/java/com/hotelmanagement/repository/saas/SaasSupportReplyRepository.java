package com.hotelmanagement.repository.saas;

import com.hotelmanagement.entity.saas.SaasSupportReply;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SaasSupportReplyRepository extends JpaRepository<SaasSupportReply, Long> {
    List<SaasSupportReply> findAllByTicketIdOrderByCreatedAtAsc(Long ticketId);
}

package com.hotelmanagement.repository;
import com.hotelmanagement.entity.InvoiceItem;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
import java.time.*;


public interface InvoiceItemRepository extends JpaRepository<InvoiceItem,Long> {
    List<InvoiceItem> findAllByInvoiceId(Long invoiceId);
}
